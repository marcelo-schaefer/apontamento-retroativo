import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  firstValueFrom,
  fromEvent,
  map,
  Observable,
  of,
  retry,
  tap,
  timeout,
} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  token$ = new BehaviorSubject<Token | undefined>(undefined);
  username = '';

  obterToken(): Observable<Token> {
    let token = this.token$.getValue();

    return token !== undefined
      ? of(token)
      : fromEvent(window, 'message').pipe(
          timeout(15000),
          retry(3),
          map<any, Token>((evento) => {
            console.log(evento);
            this.username = (evento.data?.token?.username || '').split('@')[0];
            return {
              accessToken: evento.data?.token?.access_token,
              tokenType: evento.data?.token?.token_type,
            };
          }),
          tap((token) => {
            this.token$.next(token);
          })
        );
  }

  carregarToken(): Promise<void> {
    return firstValueFrom(this.obterToken()).then(() => void 0);
  }
}

export interface Token {
  accessToken: string;
  tokenType: string;
}
