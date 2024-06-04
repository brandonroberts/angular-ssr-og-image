import { Component, Inject } from "@angular/core";

@Component({
  selector: 'app-hello',
  standalone: true,
  template: `
    <div style="display: flex;color: green;">
      <h2>Hello, {{ props.name }}!</h2>
    </div>
  `
})
export class HelloWorldComponent {
  constructor(@Inject('props') public props: { name: string} ) {}
}