module.exports = function (config, node) {
    const nodes = node.split('.');
    let current = config;
    nodes.forEach(n => {
        const c = current[n];
        current = (c || typeof(c) === 'boolean') ? c : {};
    });
    return current;
}