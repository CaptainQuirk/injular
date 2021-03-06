import { assign, kebabCase } from './helpers';
import {
  DIRECTIVE_SUFFIX,
  identifierForController,
  instantiateDirective,
  removeReplaceableDirectiveProperties,
} from './ngHelpers';
import { attachToModule, injularCompile } from './attachToModule';
import { proxifyAngular } from './proxifyAngular';


function injectDirective(name, directiveFactory, injularData) {
  const { $injector } = injularData;
  const $compile = $injector.get('$compile');
  const $rootElement = $injector.get('$rootElement');
  const rootElement = $rootElement[0];
  const document = rootElement.ownerDocument;
  const window = document.defaultView;
  const angular = injularData.angular || window.angular;
  const directiveServiceName = `${name}${DIRECTIVE_SUFFIX}`;
  const directiveExists = $injector.has(directiveServiceName);
  let directive;
  if (directiveExists) {
    const directives = $injector.get(directiveServiceName);
    directive = directives[0];
    const newDirective = instantiateDirective(name, directiveFactory, $injector);
    removeReplaceableDirectiveProperties(directive);
    assign(directive, { compile: injularCompile }, newDirective);
  } else {
    const { $compileProvider } = injularData;
    $compileProvider.directive(name, directiveFactory);
    const directives = $injector.get(directiveServiceName);
    directive = directives[0];
  }
  const kebabName = kebabCase(name);
  const componentElements = document.querySelectorAll(`.ng-scope ${kebabName}`);
  for (let i = 0; i < componentElements.length; i += 1) {
    const componentElement = componentElements[i];
    const $componentElement = angular.element(componentElement);
    const scope = $componentElement.scope();
    const isolateScope = $componentElement.isolateScope();
    const parentScope = (isolateScope || !directiveExists) ? scope : scope.$parent;
    if ($componentElement.hasClass('ng-scope')) {
      const componentScope = isolateScope || scope;
      componentScope.$destroy();
    }
    let componentTemplate;
    if (directive.template) {
      $componentElement.children().remove();
      componentTemplate = $componentElement[0].outerHTML;
    } else {
      componentTemplate = $componentElement[0].$injularTemplate;
    }
    const $newComponentElement = $compile(componentTemplate)(parentScope);
    $componentElement.replaceWith($newComponentElement);
    parentScope.$digest();
  }
}


function injectComponent(name, options, injularData) {
  // Code from $compileProvider.component
  // eslint-disable-next-line func-names
  const controller = options.controller || function () {};

  function factory($injector) {
    function makeInjectable(fn) {
      if (typeof fn === 'function' || Array.isArray(fn)) {
        // eslint-disable-next-line func-names
        return function (tElement, tAttrs) {
          return $injector.invoke(fn, this, { $element: tElement, $attrs: tAttrs });
        };
      }
      return fn;
    }

    const template = (!options.template && !options.templateUrl ? '' : options.template);
    const ddo = {
      controller,
      controllerAs: identifierForController(options.controller) || options.controllerAs || '$ctrl',
      template: makeInjectable(template),
      templateUrl: makeInjectable(options.templateUrl),
      transclude: options.transclude,
      scope: {},
      bindToController: options.bindings || {},
      restrict: 'E',
      require: options.require,
    };

    // Copy annotations (starting with $) over to the DDO
    // eslint-disable-next-line no-restricted-syntax
    for (const key in options) {
      if (key.charAt(0) === '$') ddo[key] = options[key];
    }

    return ddo;
  }

  // TODO(pete) remove the following `forEach` before we release 1.6.0
  // The component-router@0.2.0 looks for the annotations on the controller constructor
  // Nothing in Angular looks for annotations on the factory function but we can't remove
  // it from 1.5.x yet.

  // Copy any annotation properties (starting with $
  // )over to the factory and controller constructor functions
  // These could be used by libraries such as the new component router
  // eslint-disable-next-line no-restricted-syntax
  for (const key in options) {
    if (key.charAt(0) === '$') {
      const val = options[key];
      factory[key] = val;
      // Don't try to copy over annotations to named controller
      if (typeof controller === 'function') controller[key] = val;
    }
  }

  factory.$inject = ['$injector'];

  return this.injectDirective(name, factory, injularData);
}


const injular = {
  attachToModule,
  injectComponent,
  injectDirective,
  proxifyAngular,
};

export default injular;
