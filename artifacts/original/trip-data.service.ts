import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { BROWSER_STORAGE } from '../storage';

@Injectable({
  providedIn: 'root'
})
export class TripDataService {
  
  // Base URL for API endpoints as required by assignment guidelines
  baseUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    @Inject(BROWSER_STORAGE) private storage: Storage
  ) { }

  // --- Authentication Methods ---

  // Call to our /login endpoint, returns JWT
  public login(user: User, passwd: string): Observable<AuthResponse> {
    return this.handleAuthAPICall('login', user, passwd);
  }

  // Call to our /register endpoint, creates user and returns JWT
  public register(user: User, passwd: string): Observable<AuthResponse> {
    return this.handleAuthAPICall('register', user, passwd);
  }

  // Helper method to process both login and register methods
  public handleAuthAPICall(endpoint: string, user: User, passwd: string): Observable<AuthResponse> {
    const formData = {
      name: user.name,
      email: user.email,
      password: passwd
    };
    return this.http.post<AuthResponse>(`${this.baseUrl}/${endpoint}`, formData);
  }

  // --- Trip Management Methods ---

  public getTrips(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/trips`);
  }

  public getTrip(tripCode: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/trips/${tripCode}`);
  }

  public addTrip(formData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/trips`, formData);
  }

  public updateTrip(formData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/trips/${formData.code}`, formData);
  }
}