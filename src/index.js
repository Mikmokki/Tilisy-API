'use strict';
const { getJWT, config, input, getCode } = require("./utils")
const fetch = require('node-fetch');
const main = async () => {


    const BASE_URL = "https://api.tilisy.com"
    const REDIRECT_URL = config.redirectUrl
    const BANK_NAME = "Nordea"
    const BANK_COUNTRY = "FI"
    const JWT = getJWT()
    const baseHeaders = {
        Authorization: `Bearer ${JWT}`,
        'Content-Type': 'application/json'
    }
    const aspspsResponse = await fetch(`${BASE_URL}/aspsps`, {
        headers: baseHeaders
    })
    // If you want you can override BANK_NAME and BANK_COUNTRY with any bank from this list
    const aspspsData = await aspspsResponse.json()
    console.log(`ASPSPS data`, aspspsData.aspsps)

    // 10 days ahead
    const validUntil = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000);
    const startAuthorizationBody = {
        access: {
            valid_until: validUntil.toISOString()
        },
        aspsp: {
            name: BANK_NAME,
            country: BANK_COUNTRY
        },
        state: "some_test_state",
        redirect_url: REDIRECT_URL
    }
    const startAuthorizationResponse = await fetch(`${BASE_URL}/auth`, {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify(startAuthorizationBody)
    })
    const startAuthorizationData = await startAuthorizationResponse.json()

    const redirectedUrl = await input(`Please go to ${startAuthorizationData.url}, authorize consent and paste here the url you have been redirected to: `)
    const createSessionBody = {
        code: getCode(redirectedUrl)
    }
    const createSessionResponse = await fetch(`${BASE_URL}/sessions`, {
        method: "POST",
        headers: { 'accept': 'application/json', ...baseHeaders },
        body: JSON.stringify(createSessionBody)
    })
    const createSessionData = await createSessionResponse.json()
    console.log(createSessionData, "cSD")
    const sessionId = createSessionData.session_id

    const sessionResponse = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
        headers: baseHeaders
    })
    const sessionData = await sessionResponse.json()
    console.log(sessionData, "sD")

    const accountId = sessionData.accounts[0]
    console.log(accountId, "aID")
    const accountBalancesResponse = await fetch(`${BASE_URL}/accounts/${accountId}/balances`, {
        headers: baseHeaders
    })
    console.log(`Account balances data:`, await accountBalancesResponse.json())

    const accountTransactionsResponse = await fetch(`${BASE_URL}/accounts/${accountId}/transactions`, {
        headers: baseHeaders
    })
    console.log(`Account transactions data:`, await accountTransactionsResponse.json())
}

(async () => {
    try {
        await main()
    } catch (error) {
        console.log(`Unexpected error happened: ${error}`)
    }
})();
