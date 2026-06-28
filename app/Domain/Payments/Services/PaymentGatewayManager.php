<?php

declare(strict_types=1);

namespace App\Domain\Payments\Services;

use App\Domain\Payments\Contracts\PaymentGateway;
use App\Domain\Payments\Exceptions\PaymentException;

/**
 * Registry and factory for payment gateway implementations.
 *
 * Registered as a singleton in AppServiceProvider. All gateway implementations
 * are registered at boot time so the checkout validation rule can resolve them
 * without additional bootstrapping.
 *
 * Usage:
 *   $manager = app(PaymentGatewayManager::class);
 *   $gateway = $manager->get('cod');          // throws PaymentException if unknown
 *   $enabled = $manager->enabled();           // keyed by name(), filtered to isEnabled()
 *   $all     = $manager->all();               // all registered gateways, keyed by name()
 */
class PaymentGatewayManager
{
    /** @var array<string, PaymentGateway> */
    private array $gateways = [];

    /**
     * Register a gateway implementation.
     *
     * Overwrites any previously registered gateway with the same name(),
     * allowing test doubles to be substituted cleanly.
     */
    public function register(PaymentGateway $gateway): void
    {
        $this->gateways[$gateway->name()] = $gateway;
    }

    /**
     * Retrieve a gateway by its machine key.
     *
     * @throws PaymentException when no gateway with the given name is registered
     */
    public function get(string $name): PaymentGateway
    {
        if (! isset($this->gateways[$name])) {
            throw new PaymentException("Payment gateway \"{$name}\" is not registered.");
        }

        return $this->gateways[$name];
    }

    /**
     * Check whether a gateway with the given name has been registered.
     */
    public function has(string $name): bool
    {
        return isset($this->gateways[$name]);
    }

    /**
     * All registered gateways that are currently enabled, keyed by name().
     *
     * Use this to build the checkout payment-method list and to validate
     * payment_method input in StoreCheckoutRequest.
     *
     * @return array<string, PaymentGateway>
     */
    public function enabled(): array
    {
        return array_filter($this->gateways, fn (PaymentGateway $g) => $g->isEnabled());
    }

    /**
     * All registered gateways (enabled and disabled), keyed by name().
     *
     * Useful for admin settings pages that need to show disabled gateways.
     *
     * @return array<string, PaymentGateway>
     */
    public function all(): array
    {
        return $this->gateways;
    }
}
