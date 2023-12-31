const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


// middleWare
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dd29rey.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // Creating database
        const userColletion = client.db('bistroDb').collection('users');
        const menuColletion = client.db('bistroDb').collection('menu');
        const reviewColletion = client.db('bistroDb').collection('reviews');
        const cartColletion = client.db('bistroDb').collection('carts');
        const paymentColletion = client.db('bistroDb').collection('payments');


        // JWT related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            // res.cookie('token',{token})
            res.send({ token })
        })


        // middlewares for verify jwt token
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token',req.headers);
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify Admin after verify token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userColletion.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next();
        }

        // Users related api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userColletion.find().toArray()
            res.send(result);
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const query = { email: email }
            const user = await userColletion.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user does not exists
            // you can do this many way(1.Unique email, 2.upsert, 3.simple checking)
            const query = { email: user.email }
            const existingUser = await userColletion.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userColletion.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userColletion.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //delete specific users
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userColletion.deleteOne(query)
            res.send(result)
        })


        // menu related apis
        // find all menu data
        app.get('/menu', async (req, res) => {
            const result = await menuColletion.find().toArray()
            res.send(result)
        })

        // add menu Item
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await menuColletion.insertOne(item)
            res.send(result)
        })

        // get single menu item
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuColletion.findOne(query)
            res.send(result)
        })

        // update menu item
        app.patch('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }
            const result = await menuColletion.updateOne(filter, updatedDoc)
            res.send(result)
        })

        // delete a item
        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuColletion.deleteOne(query)
            res.send(result)
        })

        // Find all reviews data
        app.get('/reviews', async (req, res) => {
            const result = await reviewColletion.find().toArray()
            res.send(result)
        })

        // carts Collection
        // find carts data
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const result = await cartColletion.find(query).toArray();
            res.send(result);
        })

        // add data to cart
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartColletion.insertOne(cartItem)
            res.send(result)
        })
        // delete a cart item
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartColletion.deleteOne(query)
            res.send(result)
        })

        // payment related api
        // Payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"]
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // get payment history
        app.get('/payments/:email', verifyToken, async (req, res) => {
            const query = { email: req.params.email }
            if (req.params.email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const result = await paymentColletion.find(query).toArray()
            res.send(result);
        })

        // save payment
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentColletion.insertOne(payment)

            // carefully delete each item from the cart
            // console.log('payment info',payment);
            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))  //ekadhik id query korte
                }
            }
            const deleteResult = await cartColletion.deleteMany(query);
            res.send({ paymentResult, deleteResult });
        })

        // stats or analytics
        app.get('/admin-stats',verifyToken,verifyToken, async (req, res) => {
            const users = await userColletion.estimatedDocumentCount();
            const menuItems = await menuColletion.estimatedDocumentCount();
            const orders = await paymentColletion.estimatedDocumentCount();

            // this is not the best way to calculate total payments price
            // const payments = await paymentColletion.find().toArray();
            // const revenue = payments.reduce((sum, payment) => sum + payment.price, 0)

            // this is the best way to calculate total payments
            const result = await paymentColletion.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: '$price'
                        }
                    }
                }
            ]).toArray();
            const revenue = result.length > 0 ? result[0].totalRevenue : 0;

            res.send({
                users,
                menuItems,
                orders,
                revenue
            })
        })

        // Order status
        /**
         * --------------------------
         * NON-Efficient way
         * --------------------------
         * 1.load all the payments
         * 2.for every menuItemIds (which is an array), go find the item from menu collection
         * 3.for every item in the menu  in the collection that you found from a payment entry (document)
         * 
        */

        // using aggregate pipe line
        app.get('/order-stats',verifyToken,verifyAdmin,async(req,res)=>{
            const result = await paymentColletion.aggregate([
                {
                    $unwind:'$menuItemIds'
                },
                {
                    $lookup: {
                        from: 'menu',
                        localField: 'menuItemIds',
                        foreignField: '_id',
                        as: 'menuItems'
                    }
                },
                {
                    $unwind: '$menuItems'
                },
                {
                    $group:{
                        _id: '$menuItems.category',
                        quantity:{ $sum: 1},
                        revenue: {$sum: '$menuItems.price'}
                    }
                },
                {
                    $project:{
                        _id:0,
                        category: '$_id',
                        quantity:'$quantity',
                        revenue: '$revenue'
                    }
                }
            ]).toArray();
            res.send(result)

        })



    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send('Bistro boss server is running')
})
app.listen(port, () => {
    console.log(`Bistro boss server is running on port ${port}`);
})