module.exports = (router) => {
    router({
        get: [
            (id) => `only query id: ${id}`,
            (id, _a) => (res => res.send(`query id: ${id} with path a: ${_a}`))
        ],
        post:  ($foo) => { return { render: (res) => {
            res.write(`foo from body: ${$foo}`);
        } }; }
    });
};