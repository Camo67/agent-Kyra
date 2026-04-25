import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role key for full access

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment variables not set. Using mock database.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Mock database for local development without Supabase
let mockLeads = [];
let mockIdCounter = 1;

const db = {
  /**
   * Get all leads with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Array} Array of leads
   */
  async getLeads(filters = {}) {
    if (supabase) {
      let query = supabase.from('leads').select('*');
      
      // Apply filters if provided
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.industry) {
        query = query.ilike('industry', `%${filters.industry}%`);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.country) {
        query = query.ilike('country', `%${filters.country}%`);
      }
      if (filters.website_quality_min) {
        query = query.gte('website_quality_score', filters.website_quality_min);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching leads:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } else {
      // Mock implementation
      let results = [...mockLeads];
      
      if (filters.status) {
        results = results.filter(lead => lead.status === filters.status);
      }
      if (filters.industry) {
        results = results.filter(lead => 
          lead.industry.toLowerCase().includes(filters.industry.toLowerCase())
        );
      }
      if (filters.city) {
        results = results.filter(lead => 
          lead.city.toLowerCase().includes(filters.city.toLowerCase())
        );
      }
      if (filters.country) {
        results = results.filter(lead => 
          lead.country.toLowerCase().includes(filters.country.toLowerCase())
        );
      }
      if (filters.website_quality_min) {
        results = results.filter(lead => 
          lead.website_quality_score >= filters.website_quality_min
        );
      }
      
      return results;
    }
  },

  /**
   * Create a new lead
   * @param {Object} leadData - Lead data to insert
   * @returns {Object} Created lead
   */
  async createLead(leadData) {
    if (supabase) {
      // Prepare the lead data
      const newLead = {
        name: leadData.name,
        phone: leadData.phone,
        address: leadData.address,
        website: leadData.website,
        industry: leadData.industry,
        city: leadData.city,
        country: leadData.country,
        website_quality_score: leadData.website_quality_score || 0,
        outreach_status: leadData.outreach_status || 'pending',
        status: leadData.status || 'new',
        last_contacted: leadData.last_contacted || null,
        notes: leadData.notes || '',
        scraped_at: leadData.scraped_at || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('leads')
        .insert([newLead])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating lead:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } else {
      // Mock implementation
      const newLead = {
        id: mockIdCounter++,
        name: leadData.name,
        phone: leadData.phone,
        address: leadData.address,
        website: leadData.website,
        industry: leadData.industry,
        city: leadData.city,
        country: leadData.country,
        website_quality_score: leadData.website_quality_score || 0,
        outreach_status: leadData.outreach_status || 'pending',
        status: leadData.status || 'new',
        last_contacted: leadData.last_contacted || null,
        notes: leadData.notes || '',
        scraped_at: leadData.scraped_at || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      mockLeads.push(newLead);
      return { ...newLead };
    }
  },

  /**
   * Update an existing lead
   * @param {number} id - Lead ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated lead
   */
  async updateLead(id, updateData) {
    if (supabase) {
      const { data, error } = await supabase
        .from('leads')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating lead:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } else {
      // Mock implementation
      const index = mockLeads.findIndex(lead => lead.id === id);
      
      if (index === -1) {
        throw new Error('Lead not found');
      }
      
      const updatedLead = {
        ...mockLeads[index],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      mockLeads[index] = updatedLead;
      return { ...updatedLead };
    }
  },

  /**
   * Delete a lead
   * @param {number} id - Lead ID
   * @returns {boolean} Success status
   */
  async deleteLead(id) {
    if (supabase) {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting lead:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      return true;
    } else {
      // Mock implementation
      const initialLength = mockLeads.length;
      mockLeads = mockLeads.filter(lead => lead.id !== id);
      return mockLeads.length < initialLength;
    }
  },

  /**
   * Bulk create leads
   * @param {Array} leadsData - Array of lead data
   * @returns {Array} Created leads
   */
  async createLeads(leadsData) {
    if (supabase) {
      // Prepare all leads
      const leadsToInsert = leadsData.map(lead => ({
        name: lead.name,
        phone: lead.phone,
        address: lead.address,
        website: lead.website,
        industry: lead.industry,
        city: lead.city,
        country: lead.country,
        website_quality_score: lead.website_quality_score || 0,
        outreach_status: lead.outreach_status || 'pending',
        status: lead.status || 'new',
        last_contacted: lead.last_contacted || null,
        notes: lead.notes || '',
        scraped_at: lead.scraped_at || new Date().toISOString(),
        created_at: new Date().toISOString()
      }));
      
      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();
      
      if (error) {
        console.error('Error creating leads:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } else {
      // Mock implementation
      const createdLeads = [];
      
      for (const leadData of leadsData) {
        const newLead = {
          id: mockIdCounter++,
          name: leadData.name,
          phone: leadData.phone,
          address: leadData.address,
          website: leadData.website,
          industry: leadData.industry,
          city: leadData.city,
          country: leadData.country,
          website_quality_score: leadData.website_quality_score || 0,
          outreach_status: leadData.outreach_status || 'pending',
          status: leadData.status || 'new',
          last_contacted: leadData.last_contacted || null,
          notes: leadData.notes || '',
          scraped_at: leadData.scraped_at || new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        mockLeads.push(newLead);
        createdLeads.push({ ...newLead });
      }
      
      return createdLeads;
    }
  },

  /**
   * Get lead statistics
   * @returns {Object} Statistics about leads
   */
  async getStats() {
    if (supabase) {
      // Get counts by status
      const { count: totalCount, error: totalError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) {
        console.error('Error getting total count:', totalError);
        throw new Error(`Database error: ${totalError.message}`);
      }
      
      // Get counts by status
      const { data: statusCounts, error: statusError } = await supabase.rpc('get_leads_by_status');
      
      if (statusError && statusError.message !== 'Function get_leads_by_status does not exist') {
        console.error('Error getting status counts:', statusError);
        throw new Error(`Database error: ${statusError.message}`);
      }
      
      return {
        total: totalCount,
        byStatus: statusCounts || [],
        timestamp: new Date().toISOString()
      };
    } else {
      // Mock implementation
      const stats = {
        total: mockLeads.length,
        byStatus: {},
        timestamp: new Date().toISOString()
      };
      
      for (const lead of mockLeads) {
        stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
      }
      
      return stats;
    }
  }
};

export { db };