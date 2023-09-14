import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

const JWT_SECRET = "sdjhgcbdshgcsfhdfsdsdsdssdcrrf454dfjgdhfg4dfdhk";

try {
  await mongoose.connect("mongodb://127.0.0.1:27017/myLoginRegisterDB");
} catch (error) {
  handleError(error);
}

const userSchema = new mongoose.Schema(
  {
    name: String,
    number: Number,
    password: String,
    UserType: String,
    Balance: Number,
    AccountHolder: String,
    BankName: String,
    ifscCode: String,
    AccountNumber: Number,
    WithdrawAmount: Number,
    StatusWithdraw: Boolean,
    ApprovedAmount: Boolean,
  },
  {
    timestamps: true,
  }
);

const activeSchema = new mongoose.Schema(
  {
    amounts: Number,
    selectNum: Number,
    userId: String,
    name: String,
    contact: String,
  },
  {
    timestamps: true,
  }
);

const dateSchema = new mongoose.Schema(
  {
    dated: Date,
  },
  {
    timestamps: true,
  }
);

const User = new mongoose.model("User", userSchema);

const ActiveUser = new mongoose.model("ActiveUser", activeSchema);

const DateUser = new mongoose.model("DateUser", dateSchema);

app.post("/useractive", (req, res) => {
  const { amounts, selectNum, userId, name, contact } = req.body;

  ActiveUser.find({}).then((activeuser) => {
    activeuser = new ActiveUser({
      amounts,
      selectNum,
      userId,
      name,
      contact,
    });
    activeuser.save(res.send({ message: "Your Number Selected Successfully" }));
  });
});

app.post("/login", (req, res) => {
  const { number, password } = req.body;
  User.findOne({ number: number }).then((user) => {
    if (user) {
      if (password === user.password) {
        const token = jwt.sign({ number: user.number }, JWT_SECRET);
        if (res.status(201)) {
          return res.send({
            status: "ok",
            message: "Login Successfully",
            token: token,
            user: user,
          });
        } else {
          return res.send({ error: "error" });
        }
      } else {
        res.send({ message: "Password Incorrect" });
      }
    } else {
      res.send({ message: "User not registered" });
    }
  });
});

app.post("/register", (req, res) => {
  const {
    name,
    number,
    password,
    UserType,
    Balance,
    AccountHolder,
    BankName,
    ifscCode,
    AccountNumber,
    WithdrawAmount,
    StatusWithdraw,
    ApprovedAmount,
  } = req.body;
  User.findOne({ number: number }).then((user) => {
    if (user) {
      res.send({ message: "User already registered" });
    } else {
      const user = new User({
        name,
        number,
        password,
        UserType,
        Balance,
        AccountHolder,
        BankName,
        ifscCode,
        AccountNumber,
        WithdrawAmount,
        StatusWithdraw,
        ApprovedAmount,
      });
      user.save(
        res.send({ message: "Registered Successfully, Please Login now" })
      );
    }
  });
});

app.get("/userlist", (req, res) => {
  User.find({}).then((user) => {
    res.send({ message: "user data fetched", user: user });
  });
});

app.get("/numberlist", (req, res) => {
  ActiveUser.find({}).then((activeuser) => {
    res.send({ message: "user data fetched", activeuser: activeuser });
  });
});

app.get("/totalamount", (req, res) => {
  ActiveUser.aggregate([
        { $group: { _id: null, salary_sum: { $sum: "$amounts" } } },
      ]).then((active) => {
          const resulted = active;
             if (resulted.length === 0) {
              res.send({ message: "user data fetched", active:0 });
          } else {
            res.send({ message: "user data fetched", active:resulted[0].salary_sum });
          }
       });
   });

app.get("/occurnum", (req, res) => {
  ActiveUser.aggregate([
    {
      $group: {
        _id: "$selectNum",
        totalAmount: { $sum: "$amounts" },
      },
    },
    {
      $sort: { totalAmount: 1 },
    },
  ]).then((winner) => {
    const existingNumbers = winner;
    const result = [];

    for (let i = 1; i <= 100; i++) {
      const existingNumber = existingNumbers.find((obj) => obj._id === i);
      if (!existingNumber) {
        result.push({ _id: i, totalAmount: 0 });
      } else {
        result.push(existingNumber);
      }
    }
    console.log(result);

    let minTotalAmount = Infinity;
    let minId = null;

    result.forEach((item) => {
      if (
        item.totalAmount < minTotalAmount ||
        (item.totalAmount === minTotalAmount && item._id < minId)
      ) {
        minTotalAmount = item.totalAmount;
        minId = item._id;
      }
    });
    ActiveUser.find({ selectNum: minId }).then((allwinner) => {
      const winnerdata = {
        selected: minId,
        WinningAmount: minTotalAmount,
        allwinner: allwinner,
      };
      console.log("Number:", minId);
      console.log("Minimum totalAmount:", minTotalAmount);
      res.send({ message: "Winner List fetched", winner: winnerdata });
    });
  });
});

app.post("/dateannounce", (req, res) => {
  const { dated } = req.body;
  const dateuser = new DateUser({
    dated,
  });
  dateuser.save(res.send({ message: "Announcement added" }));
});

app.get("/dateannouncecalled", (req, res) => {
  DateUser.find()
    .sort({ _id: -1 })
    .limit(1)
    .then((dateuser) => {
      res.send({ message: "Announcement data fetched", dateuser: dateuser });
    });
});

app.post("/updatebalance", (req, res) => {
  const { walls, uniqueId, wallet } = req.body;
  User.updateOne({ _id: uniqueId }, { $set: { Balance: walls + wallet } }).then(
    (user) => {}
  );
});

app.post("/updatebalancewallet", (req, res) => {
  const { userId, amounts } = req.body;
  User.find({ _id: userId }).then((act) => {
    const wal = act.map((ite) => ite.Balance);
    User.updateOne(
      { _id: userId },
      { $set: { Balance: wal.toString() - amounts } }
    ).then((user) => {
      console.log("updated");
    });
  });
});

app.post("/updatetransfer", (req, res) => {
  const { mobiles, tranAmount } = req.body;
  const transAmount = parseInt(tranAmount);
  User.find({ number: mobiles }).then((act) => {
    const walls = act.map((ite) => ite.Balance);
    const newWalls = walls.toString();
    const newValueAmount = parseInt(newWalls);
    User.updateOne(
      { number: mobiles },
      { $set: { Balance: newValueAmount + transAmount } }
    ).then((user) => {
      console.log("updated");
    });
  });
});

app.post("/updatetransferreceiver", (req, res) => {
  const { tranAmount, transferId } = req.body;
  User.find({ _id: transferId }).then((act) => {
    const walz = act.map((ite) => ite.Balance);
    User.updateOne(
      { _id: transferId },
      { $set: { Balance: walz.toString() - tranAmount } }
    ).then((user) => {
      console.log("updated");
    });
  });
});

app.post("/finaltransfer", (req, res) => {
  const { numberGet } = req.body;
  ActiveUser.aggregate([
    {
      $match: {
        selectNum: numberGet,
      },
    },
    {
      $group: {
        _id: "$userId",
        totalAmount: { $sum: "$amounts" },
      },
    },
  ]).then((acti) => {
    console.log(acti);
    acti.forEach(async (item) => {
      const userId = item._id;
      const totalAmount = item.totalAmount * 100;

      const user = await User.findOne({ _id: userId });

      if (user) {
        user.Balance += totalAmount;
        await User.updateOne(
          { _id: userId },
          { $set: { Balance: user.Balance } }
        );
        console.log(
          `Updated balance for user ${userId} to ${user.Balance} and ${user.name}`
        );
      } else {
        console.log(`User ${userId} not found`);
      }
    });
  });
});

app.post("/updatebankdetails", (req, res) => {
  const {
    userId,
    holder,
    bankname,
    ifsc,
    accountnumber,
    WithdrawAmount,
    StatusWithdraw,
    ApprovedAmount,
  } = req.body;
  User.updateOne(
    { _id: userId },
    {
      AccountHolder: holder,
      BankName: bankname,
      ifscCode: ifsc,
      AccountNumber: accountnumber,
      WithdrawAmount: WithdrawAmount,
      StatusWithdraw: StatusWithdraw,
      ApprovedAmount: ApprovedAmount,
    }
  ).then((user) => {});
});

app.post("/withdrawalrequest", (req, res) => {
  const {
    numbers,
    withdrawpassword,
    withdrawamount,
    flags,
    approvedamount,
    userId,
  } = req.body;
  User.findOne({ number: numbers }).then((user) => {
    if (user) {
      if (withdrawpassword === user.password) {
        User.updateOne(
          { _id: userId },
          {
            WithdrawAmount: withdrawamount,
            StatusWithdraw: flags,
            ApprovedAmount: approvedamount,
          }
        ).then((user) => {
          res.send({ message: "Withrawal Requested Please wait....." });
        });
      } else {
        res.send({ message: "Password Incorrect" });
      }
    }
  });
});

app.post("/deleteactiveuser", (req, res) => {
  ActiveUser.deleteMany({}).then((res) => {
    console.log("deleted");
  });
});

app.post("/approvedrequest", (req, res) => {
  const { approvedId } = req.body;
  User.find({ _id: approvedId }).then((act) => {
    const walz = act.map((ite) => ite.WithdrawAmount);
    const walzWithdraw = walz.toString();
    const walzBalance = act.map((ite) => ite.Balance);
    if (walzWithdraw != 0) {
      User.updateOne(
        { _id: approvedId },
        {
          $set: {
            Balance: walzBalance.toString() - walzWithdraw,
            WithdrawAmount: 0,
            StatusWithdraw: false,
            ApprovedAmount: true,
          },
        }
      ).then((user) => {
        res.send({ message: "Withdraw approved" });
      });
    } else {
      res.send({ message: "Not requested" });
    }
  });
});

//  app.post("/approvedrequestDefault", (req, res) => {
//   const { approvedId } = req.body;
//   User.find({ _id: approvedId }).then((act) => {
//     User.updateOne(
//       { _id: approvedId },
//       { $set: { WithdrawAmount: 0,StatusWithdraw:false, ApprovedAmount:true}},

//     ).then((user) => {
//       });
//     });
//  });

app.listen(9002, () => {
  console.log("BE started at port 9002");
});
