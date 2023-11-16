const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
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
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // Creating database
        const userColletion = client.db('bistroDb').collection('users');
        const menuColletion = client.db('bistroDb').collection('menu');
        const reviewColletion = client.db('bistroDb').collection('reviews');
        const cartColletion = client.db('bistroDb').collection('carts');


        // JWT related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            // res.cookie('token',{token})
            res.send({ token })
        })


        // middlewares for verify jwt token
        const verifyToken = (req, res, next) => {
            console.log('inside verify token',req.headers);
            if(!req.headers.authorization){
                return res.staus(401).send({message: 'forbidden access'})
            }
            const token = req.headers.authorization.split(' ')[1]
            
            // next();
        }

        // Users related api
        app.get('/users',verifyToken, async (req, res) => {
            const result = await userColletion.find().toArray()
            res.send(result);
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

        app.patch('/users/admin/:id', async (req, res) => {
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
        app.delete('/users/:id', async (req, res) => {
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