import Particle from 'particle-api-js';

const particle = new Particle();



export async function particleAuth()
{
    return new Promise((resolve, reject) =>
    {
        particle.login({ username: process.env.PARTICLE_USER, password: process.env.PARTICLE_PASSWORD }).then(
            function (data)
            {
                console.log("#", "Login to Particle API successful.");
                resolve(data.body.access_token);

            },
            function (err)
            {
                console.log("#", 'API call completed on promise fail: ', err);
                reject("fail");
            }
        );
    });
}


export async function publishParticleEvent(token, eventName, eventData)
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
                console.log("#", "Event published succesfully");
                return { success: true };
            }
        },
        function (err)
        {
            console.log("#", "Failed to publish event: " + err);
        }
    );

}
