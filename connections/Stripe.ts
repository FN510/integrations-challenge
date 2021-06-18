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

const StripeConnection: ProcessorConnection<APIKeyCredentials, CardDetails> = {
  name: 'STRIPE',

  website: 'stripe.com',

  configuration: {
    accountId: '...Find a unique ID for the accounnt annd put it here...',
    apiKey: 'sk_test_51J3QW8JZyWuISDQLU7lNt2gtMtajw31Ex6uV26o0ihyTzPPiRViPv9t9TMf07jxVQz6FjhwdcNMbbHJva0AU5Hl700ESMqS5bS',
  },

  /**
   * You should authorize a transaction and return an appropriate response
   */

  /** 
   * RawAuthorizationRequest data could be user input data from a checkout form.  
   * We use this data + API_key in a post request to stripe/paymentIntent  
   * 
   * */ 
  authorize(
    request: RawAuthorizationRequest<APIKeyCredentials, CardDetails>,
  ): Promise<ParsedAuthorizationResponse> {
    let url = "https://api.stripe.com/v1/payment_intents";

    let body = {
      "amount": request.amount,
      "currency": request.currencyCode,
      "payment_method_types[]": "card",
    };
    // post request to stripe/PaymentIntent
    HttpClient.request(url, {method: "post", body: JSON.stringify(body)});
    
    // create paymentMethod
    let cardDetails = request.paymentMethod;
    



    throw new Error('Method Not Implemented');
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
