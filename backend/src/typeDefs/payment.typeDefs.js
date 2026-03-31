import gql from 'graphql-tag';

const paymentTypeDef = gql`
  type PaymentPlayer {
    playerId: ID!
    gamesPlayed: Int
    total: Int!
    status: String
    checkedOutAt: String
  }

  type Payment {
    _id: ID!
    sessionId: ID!
    pricePerGame: Int!
    players: [PaymentPlayer!]!
    totalRevenue: Int!
    closedAt: String!
    createdAt: String!
    updatedAt: String!
  }

  type PaymentQueryResponse {
    ok: Boolean!
    message: String!
    payment: Payment
  }

  type PaymentsHistoryQueryResponse {
    ok: Boolean!
    message: String!
    payments: [Payment!]!
  }

  type Query {
    billingBySession(sessionId: ID!): PaymentQueryResponse!
    paymentsHistory: PaymentsHistoryQueryResponse!
  }

  enum PaymentSubType {
    CREATED
    UPDATED
  }

  type PaymentSubPayload {
    type: PaymentSubType!
    payment: Payment!
  }

  extend type Subscription {
    paymentSub: PaymentSubPayload!
  }
`;

export default paymentTypeDef;
