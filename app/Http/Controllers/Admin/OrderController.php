<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Orders\Exceptions\RefundException;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Services\OrderService;
use App\Domain\Orders\Services\RefundService;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Exceptions\UnsupportedCapabilityException;
use App\Domain\Shared\Idempotency\IdempotencyConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RefundOrderRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
        private readonly RefundService $refundService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Order::class);

        return Inertia::render('Admin/Orders/Index', [
            'orders' => $this->orderService->paginate(20, $request->only(['status', 'search'])),
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $this->authorize('view', $order);

        return Inertia::render('Admin/Orders/Show', [
            'order' => $order->load([
                'items.product',
                'items.variation',
                'billingAddress',
                'shippingAddress',
                'statusHistory.createdBy',
                'transactions',
                'customer',
            ]),
            'canRefund' => $request->user()?->can('process_refund', $order) ?? false,
        ]);
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $this->authorize('update_status', $order);

        $data = $request->validate([
            'status' => ['required', 'in:pending,processing,on_hold,completed,cancelled,refunded,failed'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->orderService->updateStatus($order, $data['status'], $data['note'] ?? null);

        return back()->with('success', 'Order status updated.');
    }

    public function addNote(Request $request, Order $order): RedirectResponse
    {
        $this->authorize('add_note', $order);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
            'is_customer_note' => ['boolean'],
        ]);

        $this->orderService->addNote($order, $data['note'], $data['is_customer_note'] ?? false);

        return back()->with('success', 'Note added.');
    }

    /**
     * Process a refund for the given order.
     *
     * Authorization is enforced by RefundOrderRequest::authorize() via the
     * OrderPolicy::process_refund gate (CLAUDE.md §11.1). The Form Request
     * validates input before this method body runs.
     */
    public function refund(RefundOrderRequest $request, Order $order): RedirectResponse
    {
        $data = $request->validated();

        try {
            $this->refundService->refund(
                order: $order,
                amountMinor: (int) $data['amount'],
                reason: (string) ($data['reason'] ?? ''),
                actorId: $request->user()?->id,
                idempotencyKey: (string) $data['idempotency_key'],
                restock: (bool) ($data['restock'] ?? false),
            );
        } catch (RefundException|PaymentException|UnsupportedCapabilityException $e) {
            return back()->withErrors(['refund' => $e->getMessage()]);
        } catch (IdempotencyConflictException $e) {
            return back()->withErrors(['refund' => 'A refund request with this key is already being processed. Please wait and refresh.']);
        }

        return back()->with('success', 'Refund processed successfully.');
    }
}
