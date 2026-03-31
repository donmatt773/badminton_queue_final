import mongoose from 'mongoose';

const paymentPlayerSchema = new mongoose.Schema(
  {
    playerId: {type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    gamesPlayed: {type: Number,
      min: 0,
      default: 0,
    },
    total: {type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PAID', 'UNPAID', 'PENDING'],
      default: 'PENDING',
    },
    checkedOutAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    sessionId: {type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    pricePerGame: {type: Number,
      required: true,
      min: 0,
      immutable: true,
    },
    players: {
      type: [paymentPlayerSchema],
      required: true,
      default: [],
    },
    totalRevenue: {
      type: Number,
      required: true,
      min: 0,
    },
    closedAt: {
      type: Date,
      required: true,
      immutable: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default Payment;
