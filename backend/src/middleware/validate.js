//validate.js
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const issues = err.issues || err.errors || [];
      if (issues.length > 0) {
        const errorMessages = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        const validationError = new Error(`Validation Error: ${errorMessages}`);
        validationError.status = 400;
        validationError.details = issues;
        return next(validationError);
      }
      next(err);
    }
  };
}

module.exports = validate;
