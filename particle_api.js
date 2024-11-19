


const particleAuth = require('./particle_auth');
const Particle = require('particle-api-js');
const particle = new Particle();



module.exports = {




    test: async function ()
    {
        return await this.publishParticleEvent("test", { fuck: "that", shit: "dawg" });
    },

    publishParticleEvent: async function (eventName, eventData)
    {
        return await particleAuth.auth().then(function (token)
        {
            let eventPublication = particle.publishEvent(
                {
                    name: eventName,

                    data: JSON.stringify(
                        eventData
                    ),


                    product: "photon-bindicator-33671",
                    auth: token
                }
            );

            eventPublication.then(
                function (data)
                {
                    if (data.body.ok)
                    {
                        console.log("Event published succesfully");
                        return { success: true };
                    }
                },
                function (err)
                {
                    console.log("Failed to publish event: " + err);
                }
            );


        });

    }

};

