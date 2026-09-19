import { RequestHandler } from 'express';

const requireApiAuth: RequestHandler = (req, res, next) => {
  const secret = process.env.KARTANA_API_SECRET;

  if (!secret) {
    res.status(503).json({ success: false, error: 'API authentication not configured.' });
    return;
  }

  if (req.get('Authorization') !== `Bearer ${secret}`) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  next();
};

export default requireApiAuth;
