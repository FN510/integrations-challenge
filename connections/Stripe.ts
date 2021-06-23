import {
  APIKeyCredentials,
  CardDetails,
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
  ProcessorConnection,
  RawAuthorizationRequest,
  RawCancelRequest,
  RawCaptureRequest,
} from '@primer-io/app-framework';
import HttpClient from '../common/HTTPClient';
const { URLSearchParams } = require('url');

const StripeConnection: ProcessorConnection<APIKeyCredentials, CardDetails> = {
  name: 'STRIPE',

  website: 'stripe.com',

  configuration: {
    accountId: '33ef7b3cf4972531b06afb52b0a15942d33438cf',
    apiKey: 'sk_test_51J3QW8JZyWuISDQLU7lNt2gtMtajw31Ex6uV26o0ihyTzPPiRViPv9t9TMf07jxVQz6FjhwdcNMbbHJva0AU5Hl700ESMqS5bS',
  },

  /**
   * You should authorize a transaction and return an appropriate response
   */

  /** 
   * RawAuthorizationRequest data could be from the basket (e.g. amount, currency).  
   * We use this data + API_key to create a PaymentIntent  
   * 
   * */
  authorize(
    request: RawAuthorizationRequest<APIKeyCredentials, CardDetails>,
  ): Promise<ParsedAuthorizationResponse> {
    // post request to create a PaymentIntent
    let createPaymentIntentUrl = "https://api.stripe.com/v1/payment_intents";
    let createPaymentIntentParams = new URLSearchParams();
    createPaymentIntentParams.append('amount', request.amount);
    createPaymentIntentParams.append('currency', request.currencyCode);
    // seperate auth and capture
    createPaymentIntentParams.append('capture_method', "manual");
    let key = this.configuration.apiKey;
    return new Promise<ParsedAuthorizationResponse>((resolve, reject) => {
      HttpClient.request(createPaymentIntentUrl,
        {
          method: "post",
          headers: { 'Authorization': 'Bearer ' + key },
          body: createPaymentIntentParams
        }
      )
        .then((res) => {
          var pi_id = JSON.parse(res.responseText).id;
          /**
          * PaymentIntent created
          * now post request to create a PaymentMethod (card details)
          */
          let urlCreatePaymentMethod = "https://api.stripe.com/v1/payment_methods";
          let cardDetails = request.paymentMethod;
          let cardBody = new URLSearchParams();
          cardBody.append('type', 'card');
          cardBody.append('billing_details[name]', cardDetails.cardholderName);
          cardBody.append('card[number]', cardDetails.cardNumber);
          cardBody.append('card[exp_month]', cardDetails.expiryMonth);
          cardBody.append('card[exp_year]', cardDetails.expiryYear);
          cardBody.append('card[cvc]', cardDetails.cvv);
          HttpClient.request(urlCreatePaymentMethod,
            {
              method: "post",
              headers: { 'Authorization': 'Bearer ' + key },
              body: cardBody
            }
          )
          .then((res) => {
            // created PaymentMethod
            // now add PaymentMethod ID to use in PaymentIntent/confirm
            var pm_id = JSON.parse(res.responseText).id;
            //post request to confirm PaymentIntent
            let urlConfirmPaymentIntent = "https://api.stripe.com/v1/payment_intents/" + pi_id + "/confirm";
            let confirmBody = new URLSearchParams();
            confirmBody.append('payment_method', pm_id);
            HttpClient.request(urlConfirmPaymentIntent,
              {
                method: "post",
                headers: { 'Authorization': 'Bearer ' + key },
                body: confirmBody
              })
              .then((res) => {
                let resJson = JSON.parse(res.responseText);
                let status = resJson.status;
                console.log(status);
                // map PaymentIntent status to TransactionStatus
                let statusMap = {
                  "requires_capture": "AUTHORIZED",
                  "requires_payment_method": "DECLINED",
                  "processing": "SETTLING",

                }
                let result = {
                  // using the PaymentIntent ID as the processorTransactionId in the return value
                  // the PaymentIntent ID is needed for capture and cancellation
                  processorTransactionId: resJson.id,
                  transactionStatus: statusMap[status] || "FAILED",
                  errorMessage: "",
                  declineReason: ""
                };
                if (result.transactionStatus == "DECLINED") {
                  result.declineReason = status;
                } else if (result.transactionStatus == "FAILED") {
                  result.errorMessage = resJson.error;
                }
                resolve(result);
              });

          })
        })
        .catch(err => {
          reject(new Error(err));
        });

    });
  },

  /**
   * Capture a payment intent - after auth the payment is held for capture
   * This method should capture the funds on an authorized transaction
   */
  capture(
    request: RawCaptureRequest<APIKeyCredentials>,
  ): Promise<ParsedCaptureResponse> {
    let key = this.configuration.apiKey;
    return new Promise<ParsedCaptureResponse>((resolve, reject) => {
    // retrieve PaymentIntent to check status
    let urlRetrievePaymentIntent = "https://api.stripe.com/v1/payment_intents/" + request.processorTransactionId;
    HttpClient.request(urlRetrievePaymentIntent,
      {
        method: "get",
        headers: { 'Authorization': 'Bearer ' + key }
      })
      .then(res => {
        let resJson = JSON.parse(res.responseText);
        if (resJson.status = "requires_capture") {
          /**
           * PaymentIntent is Authorized
           * proceed with cancellation
           */
          let urlCapturePaymentIntent = "https://api.stripe.com/v1/payment_intents/" + request.processorTransactionId + "/capture";
          HttpClient.request(urlCapturePaymentIntent,
            {
              method: "post",
              headers: { 'Authorization': 'Bearer ' + key },
              body: ""
            })
            .then(res => {
              let resJson = JSON.parse(res.responseText);
              let statusMap = {
                'succeeded': 'SETTLED',
                'requires_capture': 'AUTHORIZED'
              }
              if (resJson.status == 'succeeded') {
                resolve({ transactionStatus: statusMap[resJson.status] });
              } else {
                reject(err => new Error(resJson.error))
              }
            })
        }
      })
    })
  },

  /**
   * Cancel a payment intent
   * This one should cancel an authorized transaction
   */
  cancel(
    request: RawCancelRequest<APIKeyCredentials>,
  ): Promise<ParsedCancelResponse> {
    let key = this.configuration.apiKey;
    return new Promise<ParsedCaptureResponse>((resolve, reject) => {
    // retrieve PaymentIntent to check status
    let urlRetrievePaymentIntent = "https://api.stripe.com/v1/payment_intents/" + request.processorTransactionId;
    HttpClient.request(urlRetrievePaymentIntent,
      {
        method: "get",
        headers: { 'Authorization': 'Bearer ' + key }
      })
      // got PaymentIntent
      .then(res=> {
        let resJson = JSON.parse(res.responseText);
        if (resJson.status = "requires_capture") {
          // PaymentIntent authorized
          // cancel PaymentIntent
          let urlCancelPaymentIntent = "https://api.stripe.com/v1/payment_intents/" + request.processorTransactionId + "/cancel";
          HttpClient.request(urlCancelPaymentIntent,
            {
              method: "post",
              headers: { 'Authorization': 'Bearer ' + key },
              body: ""
            })
            .then(res => {
              let resJson = JSON.parse(res.responseText);
              if (resJson.status == 'canceled') {
                resolve({ transactionStatus: "CANCELLED" });
              } else {
                reject(err => new Error(resJson.error));
              }
            })
        }
      })
    })    
  },
};

export default StripeConnection;
