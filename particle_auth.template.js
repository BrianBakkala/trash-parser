const Particle = require('particle-api-js');
const particle = new Particle();

module.exports = {
    auth: async function ()
    {
        return new Promise((resolve, reject) =>
        {
            particle.login({ username: '_______', password: '_______' }).then(
                function (data)
                {
                    console.log("Login to Particle API successful.");
                    resolve(data.body.access_token);
                },
                function (err)
                {
                    console.log('API call completed on promise fail: ', err);
                    reject("fail");
                }
            );
        });
    },
};

