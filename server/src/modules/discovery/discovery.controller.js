import * as discoveryService from './discovery.service.js';
import { sendSuccess } from '../../shared/response.js';

export async function searchDiscoveryController(req, res, next) {
  try {
    const viewerId = req.user?.id || null;
    const result = await discoveryService.searchDiscovery(req.query, viewerId);
    return sendSuccess(res, {
      message: 'Discovery search results retrieved.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}
