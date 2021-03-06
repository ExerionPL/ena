module.exports = (res, result) => {
    switch (typeof(result)) {
        case 'function': return result(res);
        case 'object':
            if (result.render)
                return result.render(res);
            return res.send(result);
        default:
            return res.send(result);
    }
}