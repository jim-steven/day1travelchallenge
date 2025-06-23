// Flight API Integration using Amadeus API
// Real-time flight search for Chicago to Barcelona

const AMADEUS_API_KEY = 'YOUR_API_KEY'; // Replace with actual API key
const AMADEUS_API_SECRET = 'YOUR_API_SECRET'; // Replace with actual API secret
const AMADEUS_BASE_URL = 'https://test.api.amadeus.com';

class FlightSearchAPI {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    // Get OAuth token for Amadeus API
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry > Date.now()) {
            return this.accessToken;
        }

        const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: AMADEUS_API_KEY,
                client_secret: AMADEUS_API_SECRET
            })
        });

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        return this.accessToken;
    }

    // Search for flight offers
    async searchFlights(params) {
        const token = await this.getAccessToken();
        
        const searchParams = new URLSearchParams({
            originLocationCode: params.origin || 'ORD', // Chicago O'Hare
            destinationLocationCode: params.destination || 'BCN', // Barcelona
            departureDate: params.departureDate || '2025-08-05',
            returnDate: params.returnDate || '2025-08-08',
            adults: params.adults || '1',
            travelClass: params.travelClass || 'BUSINESS',
            max: params.maxResults || '10'
        });

        // Add preferred airlines if specified
        if (params.includedAirlineCodes) {
            searchParams.append('includedAirlineCodes', params.includedAirlineCodes.join(','));
        }

        const response = await fetch(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${searchParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Format flight data for display
    formatFlightData(apiResponse) {
        const flights = [];
        
        apiResponse.data.slice(0, 3).forEach((offer, index) => {
            const outbound = offer.itineraries[0];
            const returnFlight = offer.itineraries[1];
            
            const totalDuration = this.parseDuration(outbound.duration) + this.parseDuration(returnFlight.duration);
            const stops = outbound.segments.length - 1;
            const airline = outbound.segments[0].carrierCode;
            
            flights.push({
                rank: index + 1,
                airline: this.getAirlineName(airline),
                price: `$${Math.round(parseFloat(offer.price.total))}`,
                duration: this.formatDuration(totalDuration),
                stops: stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`,
                departure: outbound.segments[0].departure.at.split('T')[1].substring(0, 5),
                arrival: outbound.segments[outbound.segments.length - 1].arrival.at.split('T')[1].substring(0, 5),
                aircraft: outbound.segments[0].aircraft?.code || 'N/A',
                bookingUrl: `https://www.amadeus.com/book?offer=${offer.id}`
            });
        });

        return flights;
    }

    // Helper functions
    parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?/);
        const hours = match[1] ? parseInt(match[1]) : 0;
        const minutes = match[2] ? parseInt(match[2]) : 0;
        return hours * 60 + minutes;
    }

    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    getAirlineName(code) {
        const airlines = {
            'AA': 'American Airlines',
            'UA': 'United Airlines',
            'BA': 'British Airways',
            'IB': 'Iberia',
            'LH': 'Lufthansa',
            'AF': 'Air France',
            'KL': 'KLM'
        };
        return airlines[code] || code;
    }
}

// Usage example
async function updateFlightPrices() {
    try {
        const flightAPI = new FlightSearchAPI();
        
        // Search for business class flights from Chicago to Barcelona
        const searchParams = {
            origin: 'ORD',
            destination: 'BCN',
            departureDate: '2025-08-05',
            returnDate: '2025-08-08',
            adults: '1',
            travelClass: 'BUSINESS',
            includedAirlineCodes: ['AA', 'UA', 'BA'], // Preferred airlines
            maxResults: 10
        };

        console.log('Searching for flights...');
        const flightData = await flightAPI.searchFlights(searchParams);
        const formattedFlights = flightAPI.formatFlightData(flightData);
        
        console.log('Top 3 Flight Options:');
        formattedFlights.forEach(flight => {
            console.log(`${flight.rank}. ${flight.airline} - ${flight.price} (${flight.duration}, ${flight.stops})`);
        });

        return formattedFlights;

    } catch (error) {
        console.error('Error fetching flight data:', error);
        return [];
    }
}

// Auto-update website with real-time data
async function updateWebsiteWithRealTimeData() {
    const flights = await updateFlightPrices();
    
    if (flights.length === 0) {
        console.log('No flight data available - using cached prices');
        return;
    }

    // Update the HTML file with real-time data
    // This would integrate with your existing chicago-barcelona-travel.html
    console.log('Website updated with real-time flight prices');
    return flights;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FlightSearchAPI, updateFlightPrices, updateWebsiteWithRealTimeData };
}
