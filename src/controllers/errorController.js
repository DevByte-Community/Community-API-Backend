const sendErrorDev = (err, res) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';
    const message = err.message
    const stack = err.stack
    // error: err

    res.status(statusCode).json({
        status,
        message,
        stack
    });

} 
const sendErrorProd = (err, res) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';
    const message = err.message
    // const stack = err.stack
    // error: err

    if (err.isOperational) {
        res.status(statusCode).json({
            status,
            message,
            // stack
        });
    }

    console.log(err.name, err.message, err.stack);

    return res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
    });

};

const globalErrorHandler = (err, req, res, next) => {
    // (err, res, next) => {
    //     res.status(err.statusCode || 500).json({
    //         status: err.status || 'error',
    //         message: err.message || 'Internal Server Error',
    //         stack:  err.stack
    //     });
    // }

    let error = '';
    if (err.code === 50001) {
        error = new AppError();
    }
    if (process.env.NODE_ENV === 'development') {
        return sendErrorDev(err, res);
    }
    sendErrorDev(err, res);

    next(err);

};

module.exports = globalErrorHandler;