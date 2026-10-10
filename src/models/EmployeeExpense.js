import mongoose from 'mongoose';

const employeeExpenseSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
      index: true
    },
    paidBy: {
      type: String,
      trim: true,
      default: ''
    },
    date: {
      type: String,
      required: [true, 'Expense date is required (YYYY-MM-DD)'],
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      enum: {
        values: [
          'Fuel/Petrol',
          'Food/Meals',
          'Bike Maintenance',
          'Tea/Snacks',
          'Mobile/Recharge',
          'Travel/Bus/Auto',
          'Stationery/Printing',
          'Emergency',
          'Other'
        ],
        message: 'Invalid expense category'
      }
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    receiptNumber: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Composite index for fast date querying per employee
employeeExpenseSchema.index({ employeeId: 1, date: 1 });

const EmployeeExpense = mongoose.model('EmployeeExpense', employeeExpenseSchema);

export default EmployeeExpense;
