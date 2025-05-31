import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { MapService } from './services/map.service';

@NgModule({
  imports: [BrowserModule, HttpClientModule, BrowserAnimationsModule],
  providers: [MapService],
})
export class AppModule {}
