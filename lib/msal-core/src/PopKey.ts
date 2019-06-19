import { IDeviceCrytpo } from './IDeviceCrypto';
import { BrowserCrypto } from './BrowserCrypto';
import { Base64 } from 'js-base64';
import { HashAlgorithm, getStringFromArrayBuffer, KeyFormat, utf8Encode, getArrayBufferFromString, KeyUsages, KeyGenAlgorithm, getJwkString } from './PopCommon';

type CachedKeyPairs = {
    [publicKeyHash: string]: {
        publicKey: CryptoKey,
        privateKey: CryptoKey
    }
}

export class PopKey {
    private _crypto: IDeviceCrytpo;

    // https://developer.mozilla.org/en-US/docs/Web/API/RsaHashedKeyGenParams
    private static MODULUS_LENGTH: number = 2048;
    private static PUBLIC_EXPONENT: Uint8Array = new Uint8Array([0x01, 0x00, 0x01]);

    private static KEY_USAGES = [KeyUsages.sign, KeyUsages.verify];
    private static EXTRACTABLE = true;

    // Cached key pairs
    // TODO: Move to indexeddb
    private _cachedKeys: CachedKeyPairs = {};

    constructor() {
        this._crypto = new BrowserCrypto(KeyGenAlgorithm.rsassa_pkcs1_v15,HashAlgorithm.sha256, PopKey.MODULUS_LENGTH, PopKey.PUBLIC_EXPONENT);
    }

    /**
     * Generates a new proof-of-possession token.
     */
    async getNewToken(): Promise<string> {
        // Generate new key pair
        const { publicKey, privateKey } = await this._crypto.generateKey(PopKey.EXTRACTABLE, PopKey.KEY_USAGES);

        // Export public to jwk, private key to unextractable CryptoKey
        const publicKeyJwk = await this._crypto.exportKey(publicKey, KeyFormat.jwk);
        const privateKeyJwk = await this._crypto.exportKey(privateKey, KeyFormat.jwk);
        const unextractablePrivateKey = await this._crypto.importKey(privateKeyJwk, KeyFormat.jwk, false, [ KeyUsages.sign ]);

        // Generate hash of public key
        const publicJwkString = getJwkString(publicKeyJwk);
        const publicJwkBuffer = await this._crypto.digest(HashAlgorithm.sha256, publicJwkString);
        const publicKeyDigest = getStringFromArrayBuffer(publicJwkBuffer);
        const publicKeyHash = Base64.encode(utf8Encode(publicKeyDigest), true);

        // Save key pair in cache
        this._cachedKeys[publicKeyHash] = {
            publicKey,
            privateKey: unextractablePrivateKey
        };

        return publicKeyHash;
    }

    /**
     * Signs an access token with the given pop key.
     * @param publicKeyHash Public key to sign payload with
     * @param payload Payload to sign
     */
    async signToken(publicKeyHash: string, payload: object): Promise<string> {
        const {
            publicKey,
            privateKey
        } = this._cachedKeys[publicKeyHash];

        const publicKeyJwk = await this._crypto.exportKey(publicKey, KeyFormat.jwk);
        const publicJwkString = getJwkString(publicKeyJwk);

        const header = {
            alg: publicKeyJwk.alg,
            type: KeyFormat.jwk,
            jwk: JSON.parse(publicJwkString)
        };

        const encodedHeader = Base64.encode(utf8Encode(JSON.stringify(header)), true);
        const encodedPayload = Base64.encode(utf8Encode(JSON.stringify(payload)), true);

        const tokenString = `${encodedHeader}.${encodedPayload}`;
        const tokenBuffer = getArrayBufferFromString(tokenString);

        const signatureBuffer = await this._crypto.sign(privateKey, tokenBuffer);
        const encodedSignature = Base64.encode(getStringFromArrayBuffer(signatureBuffer), true);
        const signedToken = `${tokenString}.${encodedSignature}`;

        return signedToken;
    }

    /**
     * Verifies a token is signed with the given pop key.
     * @param publicKeyHash Public key used to sign token
     * @param signedToken Signed pop token
     */
    async verifyToken(publicKeyHash: string, signedToken: string) {
        const [
            header,
            payload,
            signature
        ] = signedToken.split(".");

        const tokenString = `${header}.${payload}`;
        const tokenBuffer = getArrayBufferFromString(tokenString);
        const signatureBuffer = getArrayBufferFromString(Base64.decode(signature));

        const { publicKey } = this._cachedKeys[publicKeyHash];

        return this._crypto.verify(publicKey, signatureBuffer, tokenBuffer);
    }
}
