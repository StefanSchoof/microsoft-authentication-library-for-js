import { expect } from "chai";
import sinon from "sinon";
import { Storage } from "../src/Storage";
import { Constants } from "../src";
import { CacheKeys } from "../src/Constants";
import { AccessTokenKey } from "../src/AccessTokenKey";
import { AccessTokenValue } from "../src/AccessTokenValue";
import { Account } from "../src/Account";

describe("CacheStorage.ts Class - Session Storage", function () {
    let TEST_KEY = "test_key";
    let TEST_VALUE = "test value";
    let TEST_ACCOUNT_ID = "1234";
    let TEST_STATE = "state5678";
    let cacheStorage : Storage;
    let ACCESS_TOKEN_KEY : AccessTokenKey;
    let ACCESS_TOKEN_VALUE : AccessTokenValue;
    let ACCOUNT : Account;
    const DEFAULT_INSTANCE = "https://login.microsoftonline.com/";
    const TENANT = 'common';
    const MSAL_CLIENT_ID = "0813e1d1-ad72-46a9-8665-399bba48c201";
    const validAuthority = DEFAULT_INSTANCE + TENANT;

    let setTestCacheItems = function () {
        ACCESS_TOKEN_KEY = {
            authority: validAuthority,
            clientId: MSAL_CLIENT_ID,
            scopes: "S1",
            homeAccountIdentifier: "1234"
        };
        ACCESS_TOKEN_VALUE = {
            accessToken: "accessToken1",
            idToken: "idToken",
            expiresIn: "150000000000000",
            homeAccountIdentifier: ""
        };
        ACCOUNT = {
            accountIdentifier: TEST_ACCOUNT_ID,
            environment: "js",
            homeAccountIdentifier: "1234",
            idToken: "idToken",
            name: "Test Account",
            sid: "123451435",
            userName: "TestAccount"
        };
    };

    describe("class constructor", function () {

        beforeEach(function () {

        });

        afterEach(function () {
            cacheStorage = null;
            sinon.restore();
        });

        it("parses the cache location correctly", function (done) {
            cacheStorage = new Storage("sessionStorage");
            sinon.stub(cacheStorage, <any>"cacheLocation").value("sessionStorage");
            sinon.stub(window.sessionStorage, "setItem").callsFake(function (key, value) {
                expect(key).to.be.eq(TEST_KEY);
                expect(value).to.be.eq(TEST_VALUE);
                done();
            });
            cacheStorage.setItem(TEST_KEY, TEST_VALUE);
        });

        it("throws error if cache location is not supported", function () {
            // Cannot test with current tooling - will need to take a look
            // Possibly wrapple as an option here? https://github.com/mroderick/wrapple
        });

        it("uses previous storage instance if one already exists", function () {
            let oldCacheStorage = new Storage(Constants.cacheLocationSession);
            cacheStorage = new Storage(Constants.cacheLocationLocal);
            expect(cacheStorage).to.deep.eq(oldCacheStorage);
        });

    });

    describe("sessionStorage access functions", function () {

        beforeEach(function () {
            cacheStorage = new Storage("sessionStorage");
            setTestCacheItems();
        });

        afterEach(function () {
            cacheStorage.clear();
            cacheStorage = null;
        });

        it("tests setItem works", function () {
            cacheStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(ACCESS_TOKEN_VALUE));
            expect(window.sessionStorage.getItem(JSON.stringify(ACCESS_TOKEN_KEY))).to.be.eq(JSON.stringify(ACCESS_TOKEN_VALUE));
        });

        it("tests getItem works", function () {
            window.sessionStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(ACCESS_TOKEN_VALUE));
            expect(cacheStorage.getItem(JSON.stringify(ACCESS_TOKEN_KEY))).to.be.eq(JSON.stringify(ACCESS_TOKEN_VALUE));
        });

        it("tests removeItem works", function () {
            window.sessionStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(ACCESS_TOKEN_VALUE));
            cacheStorage.removeItem(JSON.stringify(ACCESS_TOKEN_KEY));
            expect(window.sessionStorage.getItem(JSON.stringify(ACCESS_TOKEN_KEY))).to.be.null;
        });

        it("tests clear works", function () {
            let clearSpy = sinon.spy(window.sessionStorage, "clear");
            window.sessionStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(ACCESS_TOKEN_VALUE));
            cacheStorage.clear();
            expect(clearSpy.calledOnce).to.be.true;
        });

        it("tests setItemCookie works", function () {
            let idTokenNonceString = "idTokenNonce";
            cacheStorage.setItemCookie(Constants.nonceIdToken, idTokenNonceString);
            expect(document.cookie).to.include(Constants.nonceIdToken);
            expect(document.cookie).to.include(idTokenNonceString);
        });

        it("tests getItemCookie ", function () {
            let idTokenNonceString = "idTokenNonce";
            cacheStorage.setItemCookie(Constants.nonceIdToken, idTokenNonceString);
            let retrievedItem = cacheStorage.getItemCookie(Constants.nonceIdToken);
            expect(retrievedItem).to.include(idTokenNonceString);
        });

        it("tests getCookieExpirationTime", function () {
            // 86400000 ms = 1 day
            let nextDayUTC = new Date(Date.now() + 86400000);
            let actualNextDayUTC = cacheStorage.getCookieExpirationTime(1);
            let dayAfterUTC = new Date(nextDayUTC.getTime() + 86400000);
            let actualDayAfterUTC = cacheStorage.getCookieExpirationTime(2);

            expect(actualNextDayUTC).to.be.eq(nextDayUTC.toUTCString());
            expect(actualDayAfterUTC).to.be.eq(dayAfterUTC.toUTCString());
        });

        it("tests clearCookie", function () {
            let idTokenNonceString = "idTokenNonce";
            let stateLoginString = "stateLogin";
            let loginRequestString = "loginRequest";
            let stateAcquireTokenString = "stateAcquireToken";
            cacheStorage.setItemCookie(Constants.nonceIdToken, idTokenNonceString);
            cacheStorage.setItemCookie(Constants.stateLogin, stateLoginString);
            cacheStorage.setItemCookie(Constants.loginRequest, loginRequestString);
            cacheStorage.setItemCookie(Constants.stateAcquireToken, stateAcquireTokenString);
            cacheStorage.clearCookie();
            expect(document.cookie).to.be.empty;
        });
    });

    describe("MSAL Cache Item Management", function () {

        beforeEach(function () {
            cacheStorage = new Storage("sessionStorage");
            setTestCacheItems();
        });

        afterEach(function () {
            cacheStorage.clear();
            sinon.restore();
        });

        it("getAllAccessTokens returns all accessTokens in cache", function () {
            let at1 = JSON.parse(JSON.stringify(ACCESS_TOKEN_VALUE)),
            at2 = JSON.parse(JSON.stringify(ACCESS_TOKEN_VALUE)),
            at3 = JSON.parse(JSON.stringify(ACCESS_TOKEN_VALUE)),
            at4 = JSON.parse(JSON.stringify(ACCESS_TOKEN_VALUE));

            window.sessionStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(at1));
            ACCESS_TOKEN_KEY.clientId = "1813e1d1-ad72-46a9-8665-399bba48c201";
            at2.accessToken = "accessToken2";
            window.sessionStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(at2));

            ACCESS_TOKEN_KEY.homeAccountIdentifier = "4567";
            at3.accessToken = "accessToken3";
            window.sessionStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(at3));

            ACCESS_TOKEN_KEY.scopes = "S2";
            at4.accessToken = "accessToken4";
            window.sessionStorage.setItem(JSON.stringify(ACCESS_TOKEN_KEY), JSON.stringify(at4));

            let res1 = cacheStorage.getAllAccessTokens(MSAL_CLIENT_ID, "1234");
            let res2 = cacheStorage.getAllAccessTokens("1813e1d1-ad72-46a9-8665-399bba48c201", "1234");
            let res3 = cacheStorage.getAllAccessTokens("1813e1d1-ad72-46a9-8665-399bba48c201", "4567");

            expect(res1).to.be.length(1);
            expect(res2).to.be.length(1);
            expect(res3).to.be.length(2);

            expect(JSON.stringify(res1[0].value)).to.be.eq(cacheStorage.getItem(JSON.stringify(res1[0].key)));
            expect(JSON.stringify(res2[0].value)).to.be.eq(cacheStorage.getItem(JSON.stringify(res2[0].key)));
            expect(JSON.stringify(res3[0].value)).to.be.eq(cacheStorage.getItem(JSON.stringify(res3[0].key)));
            expect(JSON.stringify(res3[1].value)).to.be.eq(cacheStorage.getItem(JSON.stringify(res3[1].key)));
        });

        it("removeAcquireTokenEntries removes any acquireToken or authorityKey entries in the cache", function () {
            let acquireTokenAccountKey = Storage.generateAcquireTokenAccountKey(TEST_ACCOUNT_ID, TEST_STATE);
            let authorityKey = Storage.generateAuthorityKey(TEST_STATE);
            window.sessionStorage.setItem(acquireTokenAccountKey, JSON.stringify(ACCOUNT));
            window.sessionStorage.setItem(authorityKey, validAuthority);

            expect(cacheStorage.getItem(acquireTokenAccountKey)).to.be.eq(JSON.stringify(ACCOUNT));
            expect(cacheStorage.getItem(authorityKey)).to.be.eq(validAuthority);

            cacheStorage.removeAcquireTokenEntries();
            
            expect(cacheStorage.getItem(acquireTokenAccountKey)).to.be.null;
            expect(cacheStorage.getItem(authorityKey)).to.be.null;
        });

        it("resetCacheItems resets all msal related cache items", function () {
            window.sessionStorage.setItem(Constants.msalClientInfo, "clientInfo");
            window.sessionStorage.setItem(Constants.tokenKeys, "tokenKeys");
            window.sessionStorage.setItem(Constants.stateLogin, "stateLogin");
            window.sessionStorage.setItem(Constants.idTokenKey, "idToken1");
            window.sessionStorage.setItem(Constants.nonceIdToken, "idTokenNonce");
            window.sessionStorage.setItem(Constants.renewStatus + "|RANDOM_GUID", "Completed");

            expect(cacheStorage.getItem(Constants.msalClientInfo)).to.be.eq("clientInfo");
            expect(cacheStorage.getItem(Constants.tokenKeys)).to.be.eq("tokenKeys");
            expect(cacheStorage.getItem(Constants.stateLogin)).to.be.eq("stateLogin");
            expect(cacheStorage.getItem(Constants.idTokenKey)).to.be.eq("idToken1");
            expect(cacheStorage.getItem(Constants.nonceIdToken)).to.be.eq("idTokenNonce");
            expect(cacheStorage.getItem(Constants.renewStatus + "|RANDOM_GUID")).to.be.eq("Completed");

            cacheStorage.resetCacheItems();

            expect(cacheStorage.getItem(Constants.msalClientInfo)).to.be.eq("");
            expect(cacheStorage.getItem(Constants.tokenKeys)).to.be.eq("");
            expect(cacheStorage.getItem(Constants.idTokenKey)).to.be.eq("");
            expect(cacheStorage.getItem(Constants.nonceIdToken)).to.be.eq("");
            expect(cacheStorage.getItem(Constants.renewStatus)).to.be.null;
            expect(cacheStorage.getItem(Constants.stateLogin)).to.be.null;
        });

    });

    describe("static key generators", function () {

        it("generates acquireToken account key", function () {
            let acquireTokenAccountKey = Storage.generateAcquireTokenAccountKey(TEST_ACCOUNT_ID, TEST_STATE);
            expect(acquireTokenAccountKey).to.include(TEST_ACCOUNT_ID);
            expect(acquireTokenAccountKey).to.include(TEST_STATE);
            expect(acquireTokenAccountKey).to.include(CacheKeys.ACQUIRE_TOKEN_ACCOUNT);
        });

        it("generates authority key", function () {
            let authorityKey = Storage.generateAuthorityKey(TEST_STATE);
            expect(authorityKey).to.include(TEST_STATE);
            expect(authorityKey).to.include(CacheKeys.AUTHORITY);
        });
    });

});
