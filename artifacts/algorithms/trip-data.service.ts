import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { Trip } from '../models/trip';

@Injectable({
  providedIn: 'root'
})
export class TripDataService {

  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Retrieves stored token using standard browser localStorage
   */
  private getToken(): string {
    return localStorage.getItem('travlr-token') || '';
  }

  /**
   * Constructs HTTP Headers including JWT Bearer token
   */
  private getAuthHeaders(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      })
    };
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  public login(user: User, passwd: string): Observable<AuthResponse> {
    return this.handleAuthAPICall('login', user, passwd);
  }

  public register(user: User, passwd: string): Observable<AuthResponse> {
    return this.handleAuthAPICall('register', user, passwd);
  }

  public handleAuthAPICall(endpoint: string, user: User, passwd: string): Observable<AuthResponse> {
    const formData = {
      name: user.name,
      email: user.email,
      password: passwd
    };
    return this.http.post<AuthResponse>(`${this.baseUrl}/${endpoint}`, formData);
  }

  // ============================================================================
  // TRIP MANAGEMENT METHODS
  // ============================================================================

  public getTrips(): Observable<Trip[]> {
    return this.http.get<Trip[]>(`${this.baseUrl}/trips`);
  }

  public getTrip(tripCode: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.baseUrl}/trips/${tripCode}`);
  }

  public searchTripsByPrice(minPrice: number, maxPrice?: number): Observable<any> {
    let params = new HttpParams().set('min', minPrice.toString());
    if (maxPrice !== undefined) {
      params = params.set('max', maxPrice.toString());
    }
    return this.http.get<any>(`${this.baseUrl}/trips/search/price`, { params });
  }

  public addTrip(formData: Trip): Observable<Trip> {
    return this.http.post<Trip>(`${this.baseUrl}/trips`, formData, this.getAuthHeaders());
  }

  public updateTrip(formData: Trip): Observable<Trip> {
    return this.http.put<Trip>(`${this.baseUrl}/trips/${formData.code}`, formData, this.getAuthHeaders());
  }

  public deleteTrip(tripCode: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/trips/${tripCode}`, this.getAuthHeaders());
  }
}