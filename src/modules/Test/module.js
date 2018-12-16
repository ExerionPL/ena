module.exports = (router) => {
    router({
        get: (id, _a) => { return `query id: ${id} with path a: ${_a}`; },
        post:  ($foo) => { return { render: (res) => {
            res.write(`foo from body: ${$foo}`);
        } }; }
    });
};