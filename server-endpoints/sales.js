const fs = require('fs').promises;
const path = require('path');

// Sales endpoints module
function setupSalesRoutes(app) {
  const dataDir = '/mnt/server_data/sales_data';
  const salesDir = '/mnt/server_data/sales_data';
  const invoicesFile = path.join(salesDir, 'invoices.json');
  const quotesFile = path.join(salesDir, 'quotes.json');
  const salesOrdersFile = path.join(salesDir, 'sales_orders.json');
  const leadsFile = path.join(salesDir, 'leads.json');
  const customersFile = path.join(salesDir, 'customers.json');
  const salesConfigFile = path.join(salesDir, 'sales_config.json');
  const salesMetricsFile = path.join(salesDir, 'sales_metrics.json');

  // Ensure sales data directory exists
  async function ensureSalesDirectory() {
    try {
      await fs.mkdir(salesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating sales directory:', error);
    }
  }

  // Initialize sales data files
  async function initializeSalesFiles() {
    await ensureSalesDirectory();
   
    const files = [
      { path: invoicesFile, content: [] },
      { path: quotesFile, content: [] },
      { path: salesOrdersFile, content: [] },
      { path: leadsFile, content: [] },
      { path: customersFile, content: [] },
      { path: salesConfigFile, content: {
        taxRate: 0.0875,
        defaultPaymentTerms: 'Net 30',
        companyInfo: {
          name: 'Audio Video Integrations',
          address: '1234 Main St, Anytown, ST 12345',
          phone: '(555) 123-4567',
          email: 'info@avicentral.com'
        }
      }},
      { path: salesMetricsFile, content: {
        totalRevenue: 0,
        revenueGrowth: 0,
        outstanding: 0,
        overdueCount: 0,
        activeCustomers: 0,
        newCustomers: 0,
        conversionRate: 0,
        lastSync: new Date().toISOString()
      }}
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch (error) {
        await fs.writeFile(file.path, JSON.stringify(file.content, null, 2));
        console.log(`Created ${file.path}`);
      }
    }
  }

  // Initialize sales files
  initializeSalesFiles();

  // Helper function to read JSON file
  async function readJSONFile(filepath, defaultContent = []) {
    try {
      const data = await fs.readFile(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filepath}:`, error);
      return defaultContent;
    }
  }

  // Helper function to write JSON file
  async function writeJSONFile(filepath, data) {
    try {
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${filepath}:`, error);
      return false;
    }
  }

  // GET /api/sales/dashboard - Get sales dashboard data
  app.get('/api/sales/dashboard', async (req, res) => {
    try {
      const metrics = await readJSONFile(salesMetricsFile, {
        totalRevenue: 0,
        revenueGrowth: 0,
        outstanding: 0,
        overdueCount: 0,
        activeCustomers: 0,
        newCustomers: 0,
        conversionRate: 0,
        lastSync: new Date().toISOString()
      });

      const invoices = await readJSONFile(invoicesFile, []);
      const quotes = await readJSONFile(quotesFile, []);
      const salesOrders = await readJSONFile(salesOrdersFile, []);
      const leads = await readJSONFile(leadsFile, []);

      res.json({
        metrics,
        invoices: invoices.slice(0, 5), // Recent invoices
        quotes: quotes.slice(0, 5), // Recent quotes
        salesOrders: salesOrders.slice(0, 5), // Recent sales orders
        leads: leads.slice(0, 5) // Recent leads
      });
    } catch (error) {
      console.error('Error fetching sales dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch sales dashboard data' });
    }
  });

  // GET /api/sales/invoices - Get all invoices
  app.get('/api/sales/invoices', async (req, res) => {
    try {
      const invoices = await readJSONFile(invoicesFile, []);
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // POST /api/sales/invoices - Create new invoice
  app.post('/api/sales/invoices', async (req, res) => {
    try {
      const invoices = await readJSONFile(invoicesFile, []);
      const newInvoice = {
        id: Date.now().toString(),
        invoiceNumber: `INV-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        ...req.body
      };

      invoices.push(newInvoice);
      await writeJSONFile(invoicesFile, invoices);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'invoice_created',
          data: newInvoice
        });
      }

      res.status(201).json(newInvoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  // PUT /api/sales/invoices/:id - Update invoice
  app.put('/api/sales/invoices/:id', async (req, res) => {
    try {
      const invoices = await readJSONFile(invoicesFile, []);
      const index = invoices.findIndex(inv => inv.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      invoices[index] = {
        ...invoices[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await writeJSONFile(invoicesFile, invoices);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'invoice_updated',
          data: invoices[index]
        });
      }

      res.json(invoices[index]);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  });

  // DELETE /api/sales/invoices/:id - Delete invoice
  app.delete('/api/sales/invoices/:id', async (req, res) => {
    try {
      const invoices = await readJSONFile(invoicesFile, []);
      const index = invoices.findIndex(inv => inv.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const deletedInvoice = invoices.splice(index, 1)[0];
      await writeJSONFile(invoicesFile, invoices);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'invoice_deleted',
          data: { id: req.params.id }
        });
      }

      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  // GET /api/sales/quotes - Get all quotes
  app.get('/api/sales/quotes', async (req, res) => {
    try {
      const quotes = await readJSONFile(quotesFile, []);
      res.json(quotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ error: 'Failed to fetch quotes' });
    }
  });

  // POST /api/sales/quotes - Create new quote
  app.post('/api/sales/quotes', async (req, res) => {
    try {
      const quotes = await readJSONFile(quotesFile, []);
      const newQuote = {
        id: Date.now().toString(),
        quoteNumber: `QTE-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        ...req.body
      };

      quotes.push(newQuote);
      await writeJSONFile(quotesFile, quotes);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'quote_created',
          data: newQuote
        });
      }

      res.status(201).json(newQuote);
    } catch (error) {
      console.error('Error creating quote:', error);
      res.status(500).json({ error: 'Failed to create quote' });
    }
  });

  // PUT /api/sales/quotes/:id - Update quote
  app.put('/api/sales/quotes/:id', async (req, res) => {
    try {
      const quotes = await readJSONFile(quotesFile, []);
      const index = quotes.findIndex(quote => quote.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      quotes[index] = {
        ...quotes[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await writeJSONFile(quotesFile, quotes);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'quote_updated',
          data: quotes[index]
        });
      }

      res.json(quotes[index]);
    } catch (error) {
      console.error('Error updating quote:', error);
      res.status(500).json({ error: 'Failed to update quote' });
    }
  });

  // DELETE /api/sales/quotes/:id - Delete quote
  app.delete('/api/sales/quotes/:id', async (req, res) => {
    try {
      const quotes = await readJSONFile(quotesFile, []);
      const index = quotes.findIndex(quote => quote.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const deletedQuote = quotes.splice(index, 1)[0];
      await writeJSONFile(quotesFile, quotes);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'quote_deleted',
          data: { id: req.params.id }
        });
      }

      res.json({ message: 'Quote deleted successfully' });
    } catch (error) {
      console.error('Error deleting quote:', error);
      res.status(500).json({ error: 'Failed to delete quote' });
    }
  });

  // GET /api/sales/orders - Get all sales orders
  app.get('/api/sales/orders', async (req, res) => {
    try {
      const salesOrders = await readJSONFile(salesOrdersFile, []);
      res.json(salesOrders);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      res.status(500).json({ error: 'Failed to fetch sales orders' });
    }
  });

  // POST /api/sales/orders - Create new sales order
  app.post('/api/sales/orders', async (req, res) => {
    try {
      const salesOrders = await readJSONFile(salesOrdersFile, []);
      const newOrder = {
        id: Date.now().toString(),
        orderNumber: `SO-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        ...req.body
      };

      salesOrders.push(newOrder);
      await writeJSONFile(salesOrdersFile, salesOrders);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'order_created',
          data: newOrder
        });
      }

      res.status(201).json(newOrder);
    } catch (error) {
      console.error('Error creating sales order:', error);
      res.status(500).json({ error: 'Failed to create sales order' });
    }
  });

  // PUT /api/sales/orders/:id - Update sales order
  app.put('/api/sales/orders/:id', async (req, res) => {
    try {
      const salesOrders = await readJSONFile(salesOrdersFile, []);
      const index = salesOrders.findIndex(order => order.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Sales order not found' });
      }

      salesOrders[index] = {
        ...salesOrders[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await writeJSONFile(salesOrdersFile, salesOrders);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'order_updated',
          data: salesOrders[index]
        });
      }

      res.json(salesOrders[index]);
    } catch (error) {
      console.error('Error updating sales order:', error);
      res.status(500).json({ error: 'Failed to update sales order' });
    }
  });

  // DELETE /api/sales/orders/:id - Delete sales order
  app.delete('/api/sales/orders/:id', async (req, res) => {
    try {
      const salesOrders = await readJSONFile(salesOrdersFile, []);
      const index = salesOrders.findIndex(order => order.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Sales order not found' });
      }

      const deletedOrder = salesOrders.splice(index, 1)[0];
      await writeJSONFile(salesOrdersFile, salesOrders);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'order_deleted',
          data: { id: req.params.id }
        });
      }

      res.json({ message: 'Sales order deleted successfully' });
    } catch (error) {
      console.error('Error deleting sales order:', error);
      res.status(500).json({ error: 'Failed to delete sales order' });
    }
  });

  // GET /api/sales/leads - Get all leads
  app.get('/api/sales/leads', async (req, res) => {
    try {
      const leads = await readJSONFile(leadsFile, []);
      res.json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  // POST /api/sales/leads - Create new lead
  app.post('/api/sales/leads', async (req, res) => {
    try {
      const leads = await readJSONFile(leadsFile, []);
      const newLead = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'new',
        ...req.body
      };

      leads.push(newLead);
      await writeJSONFile(leadsFile, leads);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'lead_created',
          data: newLead
        });
      }

      res.status(201).json(newLead);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });

  // PUT /api/sales/leads/:id - Update lead
  app.put('/api/sales/leads/:id', async (req, res) => {
    try {
      const leads = await readJSONFile(leadsFile, []);
      const index = leads.findIndex(lead => lead.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      leads[index] = {
        ...leads[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await writeJSONFile(leadsFile, leads);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'lead_updated',
          data: leads[index]
        });
      }

      res.json(leads[index]);
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  // DELETE /api/sales/leads/:id - Delete lead
  app.delete('/api/sales/leads/:id', async (req, res) => {
    try {
      const leads = await readJSONFile(leadsFile, []);
      const index = leads.findIndex(lead => lead.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const deletedLead = leads.splice(index, 1)[0];
      await writeJSONFile(leadsFile, leads);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'lead_deleted',
          data: { id: req.params.id }
        });
      }

      res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  });

  // GET /api/sales/customers - Get all customers
  app.get('/api/sales/customers', async (req, res) => {
    try {
      const customers = await readJSONFile(customersFile, []);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  // POST /api/sales/customers - Create new customer
  app.post('/api/sales/customers', async (req, res) => {
    try {
      const customers = await readJSONFile(customersFile, []);
      const newCustomer = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        ...req.body
      };

      customers.push(newCustomer);
      await writeJSONFile(customersFile, customers);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'customer_created',
          data: newCustomer
        });
      }

      res.status(201).json(newCustomer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  // PUT /api/sales/customers/:id - Update customer
  app.put('/api/sales/customers/:id', async (req, res) => {
    try {
      const customers = await readJSONFile(customersFile, []);
      const index = customers.findIndex(customer => customer.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      customers[index] = {
        ...customers[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await writeJSONFile(customersFile, customers);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'customer_updated',
          data: customers[index]
        });
      }

      res.json(customers[index]);
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  });

  // DELETE /api/sales/customers/:id - Delete customer
  app.delete('/api/sales/customers/:id', async (req, res) => {
    try {
      const customers = await readJSONFile(customersFile, []);
      const index = customers.findIndex(customer => customer.id === req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const deletedCustomer = customers.splice(index, 1)[0];
      await writeJSONFile(customersFile, customers);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'customer_deleted',
          data: { id: req.params.id }
        });
      }

      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  });

  // GET /api/sales/config - Get sales configuration
  app.get('/api/sales/config', async (req, res) => {
    try {
      const config = await readJSONFile(salesConfigFile, {
        taxRate: 0.0875,
        defaultPaymentTerms: 'Net 30',
        companyInfo: {
          name: 'Audio Video Integrations',
          address: '1234 Main St, Anytown, ST 12345',
          phone: '(555) 123-4567',
          email: 'info@avicentral.com'
        }
      });
      res.json(config);
    } catch (error) {
      console.error('Error fetching sales config:', error);
      res.status(500).json({ error: 'Failed to fetch sales configuration' });
    }
  });

  // PUT /api/sales/config - Update sales configuration
  app.put('/api/sales/config', async (req, res) => {
    try {
      const config = await readJSONFile(salesConfigFile, {});
      const updatedConfig = {
        ...config,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await writeJSONFile(salesConfigFile, updatedConfig);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'config_updated',
          data: updatedConfig
        });
      }

      res.json(updatedConfig);
    } catch (error) {
      console.error('Error updating sales config:', error);
      res.status(500).json({ error: 'Failed to update sales configuration' });
    }
  });

  // POST /api/sales/metrics/update - Update sales metrics
  app.post('/api/sales/metrics/update', async (req, res) => {
    try {
      const metrics = await readJSONFile(salesMetricsFile, {});
      const updatedMetrics = {
        ...metrics,
        ...req.body,
        lastSync: new Date().toISOString()
      };

      await writeJSONFile(salesMetricsFile, updatedMetrics);

      // Broadcast update via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'sales_update',
          action: 'metrics_updated',
          data: updatedMetrics
        });
      }

      res.json(updatedMetrics);
    } catch (error) {
      console.error('Error updating sales metrics:', error);
      res.status(500).json({ error: 'Failed to update sales metrics' });
    }
  });

  // POST /api/sales/quickbooks/connect - Connect to QuickBooks
  app.post('/api/sales/quickbooks/connect', async (req, res) => {
    try {
      // This would typically handle OAuth connection to QuickBooks
      // For now, we'll return a mock response
      res.json({
        success: true,
        message: 'QuickBooks connection initiated',
        authUrl: 'https://appcenter.intuit.com/connect/oauth2',
        connected: false
      });
    } catch (error) {
      console.error('Error connecting to QuickBooks:', error);
      res.status(500).json({ error: 'Failed to connect to QuickBooks' });
    }
  });

  // GET /api/sales/quickbooks/status - Check QuickBooks connection status
  app.get('/api/sales/quickbooks/status', async (req, res) => {
    try {
      // This would check actual connection status
      res.json({
        connected: false,
        lastSync: null,
        invoiceCount: 0
      });
    } catch (error) {
      console.error('Error checking QuickBooks status:', error);
      res.status(500).json({ error: 'Failed to check QuickBooks status' });
    }
  });

  // POST /api/sales/quickbooks/sync - Sync with QuickBooks
  app.post('/api/sales/quickbooks/sync', async (req, res) => {
    try {
      // This would handle actual sync with QuickBooks
      res.json({
        success: true,
        message: 'QuickBooks sync completed',
        syncedItems: {
          invoices: 0,
          customers: 0,
          items: 0
        }
      });
    } catch (error) {
      console.error('Error syncing with QuickBooks:', error);
      res.status(500).json({ error: 'Failed to sync with QuickBooks' });
    }
  });

  console.log('Sales routes setup completed');
}

module.exports = setupSalesRoutes;
