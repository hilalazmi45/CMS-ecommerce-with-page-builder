<?php

declare(strict_types=1);

namespace App\Domain\Orders\Services;

use App\Domain\Orders\Events\OrderShipped;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Orders\ValueObjects\LineItem;
use App\Domain\Orders\ValueObjects\OrderTotals;
use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Shared\Services\ActivityLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class OrderService
{
    /**
     * Pure, server-authoritative total calculation. No persistence, no I/O.
     *
     * All amounts are Money (integer minor units) and must share one currency.
     * Discount is capped so it can never exceed the line subtotal (CLAUDE.md
     * §9.7). The total is: (subtotal − cappedDiscount) + shipping + tax.
     *
     * @param  iterable<LineItem>  $lines
     */
    public function calculate(
        iterable $lines,
        Money $discount,
        Money $shipping,
        Money $tax,
    ): OrderTotals {
        $currency = $discount->currency;

        $this->assertCurrency($shipping, $currency);
        $this->assertCurrency($tax, $currency);

        $subtotal = Money::zero($currency);
        foreach ($lines as $line) {
            $lineTotal = $line->lineTotal();
            $this->assertCurrency($lineTotal, $currency);
            $subtotal = $subtotal->add($lineTotal);
        }

        // A discount may never exceed the eligible line subtotal.
        $cappedDiscount = $discount->min($subtotal);

        $total = $subtotal->subtract($cappedDiscount)->add($shipping)->add($tax);

        return new OrderTotals(
            subtotal: $subtotal,
            discount: $cappedDiscount,
            shipping: $shipping,
            tax: $tax,
            total: $total,
        );
    }

    private function assertCurrency(Money $money, string $currency): void
    {
        if ($money->currency !== $currency) {
            throw new InvalidArgumentException(
                "All amounts must use the same currency ({$currency}); got {$money->currency}."
            );
        }
    }

    public function paginate(int $perPage = 20, array $filters = []): LengthAwarePaginator
    {
        $query = Order::query()->with(['customer'])->latest();

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('order_number', 'like', "%{$filters['search']}%")
                    ->orWhereHas('customer', fn ($q2) => $q2->where('email', 'like', "%{$filters['search']}%"));
            });
        }

        return $query->paginate($perPage);
    }

    public function updateStatus(Order $order, string $newStatus, ?string $note = null, bool $isCustomerNote = false): void
    {
        DB::transaction(function () use ($order, $newStatus, $note, $isCustomerNote) {
            $oldStatus = $order->status;
            $order->update(['status' => $newStatus]);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $oldStatus,
                'to_status' => $newStatus,
                'note' => $note,
                'is_customer_note' => $isCustomerNote,
                'created_by' => Auth::id(),
            ]);

            ActivityLogger::log(
                'orders', 'status_updated',
                Order::class, $order->id,
                ['status' => $oldStatus],
                ['status' => $newStatus]
            );
        });

        // Dispatch OrderShipped after the transaction commits when transitioning
        // to 'completed'. Keeping the dispatch outside the transaction satisfies
        // CLAUDE.md §4.3 (events fire post-commit).
        if ($newStatus === 'completed') {
            $order->refresh();
            event(new OrderShipped($order));
        }
    }

    public function addNote(Order $order, string $note, bool $isCustomerNote = false): OrderStatusHistory
    {
        $history = OrderStatusHistory::create([
            'order_id' => $order->id,
            'from_status' => null,
            'to_status' => $order->status,
            'note' => $note,
            'is_customer_note' => $isCustomerNote,
            'created_by' => Auth::id(),
        ]);

        ActivityLogger::log('orders', 'note_added', Order::class, $order->id, null, ['note' => $note]);

        return $history;
    }
}
