// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ClientInfo } from "./ClientInfo";
import { IdToken } from "./IdToken";
import { Utils } from "./Utils";
import { Dict } from "./MsalTypes";

/**
 * accountIdentifier       combination of idToken.uid and idToken.utid
 * homeAccountIdentifier   combination of clientInfo.uid and clientInfo.utid
 * userName                idToken.preferred_username
 * name                    idToken.name
 * idToken                 idToken
 * sid                     idToken.sid - session identifier
 * environment             idtoken.issuer (the authority that issues the token)
 */
export class Account {

    accountIdentifier: string;
    homeAccountIdentifier: string;
    userName: string;
    name: string;
    // will be deprecated soon
    idToken: Dict;
    claims: Dict;
    sid: string;
    environment: string;

    /**
     * Creates an Account Object
     * @praram accountIdentifier
     * @param homeAccountIdentifier
     * @param userName
     * @param name
     * @param idToken
     * @param claims
     * @param sid
     * @param environment
     */
    constructor(accountIdentifier: string, homeAccountIdentifier: string, userName: string, name: string, idTokenClaims: Dict, sid: string,  environment: string) {
      this.accountIdentifier = accountIdentifier;
      this.homeAccountIdentifier = homeAccountIdentifier;
      this.userName = userName;
      this.name = name;
      // will be deprecated soon
      this.idToken = idTokenClaims;
      this.claims = idTokenClaims;
      this.sid = sid;
      this.environment = environment;
    }

    /**
     * @hidden
     * @param idToken
     * @param clientInfo
     */
    static createAccount(idToken: IdToken, clientInfo: ClientInfo): Account {

        // Note: IdToken and ClientInfo classes handle the possibility of idToken and clientInfo being null

        // create accountIdentifier
        const accountIdentifier: string = idToken.objectId || idToken.subject;

        // create homeAccountIdentifier
        const uid: string = clientInfo ? clientInfo.uid : "";
        const utid: string = clientInfo ? clientInfo.utid : "";

        let homeAccountIdentifier: string;
        if (!Utils.isEmpty(uid) && !Utils.isEmpty(utid)) {
            homeAccountIdentifier = Utils.base64EncodeStringUrlSafe(uid) + "." + Utils.base64EncodeStringUrlSafe(utid);
        }
        return new Account(accountIdentifier, homeAccountIdentifier, idToken.preferredName, idToken.name, idToken.claims, idToken.sid, idToken.issuer);
    }
}
