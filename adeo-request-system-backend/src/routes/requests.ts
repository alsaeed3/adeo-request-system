import express from 'express';
const router = express.Router();

// GET /api/requests
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/requests received');
    // For testing, return some dummy data
    res.json([
      {
        _id: '1',
        title: 'Test Request 1',
        requestNumber: 'REQ-001',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString()
      },
      {
        _id: '2',
        title: 'Test Request 2',
        requestNumber: 'REQ-002',
        status: 'in-progress',
        priority: 'high',
        createdAt: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Error fetching requests' });
  }
});

export default router; 