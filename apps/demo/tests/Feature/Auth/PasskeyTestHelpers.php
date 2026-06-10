<?php

namespace Tests\Feature\Auth;

use Laravel\Passkeys\Support\WebAuthn;
use ParagonIE\ConstantTime\Base64UrlSafe;
use Webauthn\AuthenticatorData;
use Webauthn\PublicKeyCredentialRequestOptions;

/**
 * Helpers for building structurally valid (but cryptographically meaningless)
 * passkey credential payloads in HTTP tests.
 *
 * Values survive WebAuthn deserialization so they can be posted to the
 * passkey login endpoint when VerifyPasskey is mocked.
 */
trait PasskeyTestHelpers
{
    /**
     * Build a valid serialized PublicKeyCredentialRequestOptions for the session.
     */
    protected function makeVerificationOptionsJson(): string
    {
        $options = PublicKeyCredentialRequestOptions::create(
            challenge: random_bytes(32),
            rpId: 'localhost',
        );

        return WebAuthn::toJson($options);
    }

    /**
     * Build a structurally valid assertion credential array for POST body.
     *
     * @return array<string, mixed>
     */
    protected function makeAssertionCredential(): array
    {
        $rawId = random_bytes(16);

        $clientDataJson = json_encode([
            'type' => 'webauthn.get',
            'challenge' => Base64UrlSafe::encodeUnpadded(random_bytes(32)),
            'origin' => 'https://localhost',
        ]);

        $rpIdHash = hash('sha256', 'localhost', binary: true);
        $flags = chr(AuthenticatorData::FLAG_UP);
        $authData = $rpIdHash.$flags.pack('N', 0);

        return [
            'id' => Base64UrlSafe::encodeUnpadded($rawId),
            'type' => 'public-key',
            'rawId' => Base64UrlSafe::encodeUnpadded($rawId),
            'response' => [
                'clientDataJSON' => Base64UrlSafe::encodeUnpadded($clientDataJson),
                'authenticatorData' => Base64UrlSafe::encodeUnpadded($authData),
                'signature' => Base64UrlSafe::encodeUnpadded(random_bytes(64)),
            ],
        ];
    }
}
