const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleWare
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
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
        const menuColletion = client.db('bistroDb').collection('menu');
        const reviewColletion = client.db('bistroDb').collection('reviews');
        const cartColletion = client.db('bistroDb').collection('carts');


        // find all menu data
        app.get('/menu',async(req,res)=>{
            const result = await menuColletion.find().toArray()
            res.send(result)
        })
        // Find all reviews data
        app.get('/reviews',async(req,res)=>{
            const result = await reviewColletion.find().toArray()
            res.send(result)
        })

        // carts Collection
        app.post('/carts',async(req,res)=>{
            const cartItem = req.body;
            const result = await cartColletion.insertOne(cartItem)
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