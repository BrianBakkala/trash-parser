import * as particleAuth from './particle_auth.mjs';
import Particle from 'particle-api-js';

const particle = new Particle();




export async function test()
{
    return await this.publishParticleEvent("test", { fuck: "that", shit: "dawg" });
}

export async function publishParticleEvent(eventName, eventData)
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
                    console.log("#","Event published succesfully");
                    return { success: true };
                }
            },
            function (err)
            {
                console.log("#","Failed to publish event: " + err);
            }
        );


    });

}
