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

    const accounts = sessionData.accounts
    console.log("All accounts", sessionData.accounts)
    const accountTransactionsResponse = async (accountId) => {
        const response = await fetch(`${BASE_URL}/accounts/${accountId}/transactions`, {
            headers: baseHeaders
        })
        const res = await response.json()
        return { accountId, transactions: res.transactions }
    }
    const transactionsByAccountId = await Promise.all(accounts.map(async (accountId) => await accountTransactionsResponse(accountId)))
    console.log("Transaction info by account id.")
    transactionsByAccountId.forEach(account => {
        const transactions = account.transactions
        const debits = transactions.filter(tr => tr.credit_debit_indicator === "DBIT").map(tr => Number(tr.transaction_amount.amount))
        const credits = transactions.filter(tr => tr.credit_debit_indicator === "CRDT").map(tr => Number(tr.transaction_amount.amount))
        console.log(`Summary about account id ${account.accountId}.`)
        console.log(`Account has ${transactions.length} transactions.`)
        console.log("The total values of all inbound (credit) and outbound (debit) transactions.")
        console.log(`Debit: ${debits.reduce((prev, current) => {
            return (prev + current)
        }, 0).toFixed(2)}.`)
        console.log(`Credit: ${credits.reduce((prev, current) => {
            return (prev + current)
        }, 0).toFixed(2)}.`)
        console.log(`The biggest debit amount: ${debits.reduce((prev, current) => {
            return (prev > current) ? prev : current
        }, 0).toFixed(2)}.`)
        console.log(`The biggest credit amount: ${credits.reduce((prev, current) => {
            return (prev > current) ? prev : current
        }, 0).toFixed(2)}.\n`)
    })
}

(async () => {
    try {
        await main()
    } catch (error) {
        console.log(`Unexpected error happened: ${error}`)
    }
})();
