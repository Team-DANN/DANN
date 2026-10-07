const StaffService = require('../services/staffService');
const StaffModel = require('../models/StaffModel');

function actorFrom(req) {
  return { user_id: req.user_id, business_id: req.business_id, access: req.access };
}

class StaffController {
  static async list(req, res, next) {
    try {
      const staff = await StaffService.listStaff(actorFrom(req));
      const business_code = await StaffModel.getBusinessCode(req.business_id);
      res.json({ success: true, data: staff, business_code });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const result = await StaffService.createStaff(actorFrom(req), req.body);
      res.status(201).json({
        success: true,
        message: 'Staff account created. The PIN is shown only once, so share it now.',
        data: result, // { staff, pin, business_code }
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const staff = await StaffService.updateStaff(actorFrom(req), req.params.id, req.body);
      res.json({ success: true, data: staff });
    } catch (err) {
      next(err);
    }
  }

  static async resetPin(req, res, next) {
    try {
      const result = await StaffService.resetPin(actorFrom(req), req.params.id);
      res.json({
        success: true,
        message: 'New PIN generated. It is shown only once, so share it now.',
        data: result, // { pin }
      });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const staff = await StaffService.terminate(actorFrom(req), req.params.id);
      res.json({
        success: true,
        message: 'Access removed. Everything they logged stays in your business.',
        data: staff,
      });
    } catch (err) {
      next(err);
    }
  }

  static async staffLogin(req, res, next) {
    try {
      const result = await StaffService.staffLogin(req.body);
      res.json({ success: true, message: 'Login successful', data: result });
    } catch (err) {
      next(err);
    }
  }

  static async changePin(req, res, next) {
    try {
      await StaffService.changePin(req.user_id, req.body);
      res.json({ success: true, message: 'PIN updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = StaffController;