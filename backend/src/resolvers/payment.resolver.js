import Payment from '../models/Payment.model.js';
import { pubsub } from '../configs/pubsub.js';

const SUB_TRIGGER = 'PAYMENT_UPDATED';

const paymentResolver = {
  Query: {
    billingBySession: async (_, { sessionId }) => {
      try {
        const payment = await Payment.findOne({ sessionId });

        if (!payment) {
          return {
            ok: false,
            message: 'Billing not generated yet. Close the session first.',
            payment: null,
          };
        }

        return { ok: true, message: 'Billing fetched successfully', payment };
      } catch (error) {
        return { ok: false, message: error.message, payment: null };
      }
    },
    paymentsHistory: async () => {
      try {
        const payments = await Payment.find({}).sort({ closedAt: -1, updatedAt: -1, createdAt: -1 });

        return {
          ok: true,
          message: 'Payment history fetched successfully',
          payments,
        };
      } catch (error) {
        return {
          ok: false,
          message: error.message,
          payments: [],
        };
      }
    },
  },
  Payment: {
    closedAt: (payment) => payment.closedAt ? new Date(payment.closedAt).toISOString() : null,
    createdAt: (payment) => payment.createdAt ? new Date(payment.createdAt).toISOString() : null,
    updatedAt: (payment) => payment.updatedAt ? new Date(payment.updatedAt).toISOString() : null,
  },
  PaymentPlayer: {
    checkedOutAt: (entry) => entry.checkedOutAt ? new Date(entry.checkedOutAt).toISOString() : null,
  },
  Subscription: {
    paymentSub: {
      subscribe: () => pubsub.asyncIterableIterator(SUB_TRIGGER),
    },
  },
};

export default paymentResolver;
