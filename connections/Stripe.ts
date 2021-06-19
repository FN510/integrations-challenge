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
   * We use this data + API_key in a post request to stripe/paymentIntent  
   * 
   * */
  authorize(
    request: RawAuthorizationRequest<APIKeyCredentials, CardDetails>,
  ): Promise<ParsedAuthorizationResponse> {
    // post request to create a PaymentIntent
    let url = "https://api.stripe.com/v1/payment_intents";
    let createPaymentIntentParams = new URLSearchParams();
    createPaymentIntentParams.append('amount', request.amount);
    createPaymentIntentParams.append('currency', request.currencyCode);


    let key = this.configuration.apiKey;
    HttpClient.request(url,
      {
        method: "post",
        headers: { 'Authorization': 'Bearer ' + key },
        body: createPaymentIntentParams
      }
    )
      .then(function (res) {
        var pi_id = JSON.parse(res.responseText).id;
        console.log("pi_id: " + pi_id)

        // post request to create a PaymentMethod (card details)
        let urlCreatePaymentMethod = "https://api.stripe.com/v1/payment_methods";
        let cardDetails = request.paymentMethod;
        let cardBody = new URLSearchParams();
        cardBody.append('type', 'card')
        cardBody.append('card[number]', cardDetails.cardNumber)
        cardBody.append('card[exp_month]', cardDetails.expiryMonth)
        cardBody.append('card[exp_year]', cardDetails.expiryYear)
        cardBody.append('card[cvc]', cardDetails.cvv)


        console.log(cardBody)
        HttpClient.request(urlCreatePaymentMethod,
          {
            method: "post",
            headers: { 'Authorization': 'Bearer ' + key },
            body: cardBody
          }
        ).then(function (res) {
          // get PaymentMethod ID to use in PaymentIntent/confirm
          var pm_id = JSON.parse(res.responseText).id;
          console.log(res.responseText)
          //post request to confirm PaymentIntent
          let urlConfirmPaymentIntent = "https://api.stripe.com/v1/payment_intents/" + pi_id + "/confirm";

          console.log("pm_id: " + pm_id);
          let confirmBody = new URLSearchParams();
          confirmBody.append('payment_method', pm_id);
          HttpClient.request(urlConfirmPaymentIntent,
            {
              method: "post",
              headers: { 'Authorization': 'Bearer ' + key },
              body: confirmBody
            }).then(function (res) {
              console.log(JSON.parse(res.responseText))
              let status = JSON.parse(res.responseText).status;
              console.log(status);
              // let result = { processorTransactionId: "", transactionStatus: outcome }
              // return new Promise<ParsedAuthorizationResponse>(() => result)
            });

        })
      })




    //   // confirm paymentIntent - /v1/payment_intents/:id/confirm
    //   // create a paymentMethod



    return new Promise<ParsedAuthorizationResponse>(() => console.log('return PAR'))


    //throw new Error('Method Not Implemented');
  },

  /**
   * Capture a payment intent
   * This method should capture the funds on an authorized transaction
   */
  capture(
    request: RawCaptureRequest<APIKeyCredentials>,
  ): Promise<ParsedCaptureResponse> {
    throw new Error('Method Not Implemented');
  },

  /**
   * Cancel a payment intent
   * This one should cancel an authorized transaction
   */
  cancel(
    request: RawCancelRequest<APIKeyCredentials>,
  ): Promise<ParsedCancelResponse> {
    throw new Error('Method Not Implemented');
  },
};

export default StripeConnection;
