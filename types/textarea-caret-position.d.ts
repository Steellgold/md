declare module "textarea-caret-position" {
  export default class CaretCoordinates {
    constructor(element: HTMLTextAreaElement | HTMLInputElement);
    get(
      positionLeft: number,
      positionRight: number
    ): {
      top: number;
      left: number;
      right: number;
    };
  }
}
