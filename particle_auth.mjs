
import Particle from 'particle-api-js';
const particle = new Particle();



export async function auth()
{
    return new Promise((resolve, reject) =>
    {
        particle.login({ username: process.env.PARTICLE_USER, password: process.env.PARTICLE_PASSWORD }).then(
            function (data)
            {
                console.log("#","Login to Particle API successful.");
                resolve(data.body.access_token);
            },
            function (err)
            {
                console.log("#",'API call completed on promise fail: ', err);
                reject("fail");
            }
        );
    });
} 