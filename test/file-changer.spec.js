'use strict';

describe('fileChanger', function() {
  var angular;
  var VERSION_MINOR = window.angular.version.minor;
  var fileChanger = window.fileChanger;
  var noop = window.angular.noop;

  function bootstrapApp(appName) {
    angular.bootstrap(document.createElement('div'), [appName]);
  }

  beforeEach(function() {
    angular = window.angular.copy(window.angular);
  });

  afterEach(function() {
    window.___injular___ = undefined;
  });

  describe('.wrapTemplate', function() {

    it('should return a string that contains the content', function() {
      var content = '<div><span>FOO</span><span>BAR</span</div>';
      var newContent = fileChanger.wrapTemplate(content, '/app/main.html');
      expect(newContent).to.contain(content);
    });

    it('should add a header comment to the content', function() {
      var content = '<div><span>FOO</span><span>BAR</span</div>';
      var newContent = fileChanger.wrapTemplate(content, '/app/main.html');
      expect(newContent).to.startWith('<!--injular-start /app/main.html--><');
    });

    it('should add a footer comment to the content', function() {
      var content = '<div><span>FOO</span><span>BAR</span</div>';
      var newContent = fileChanger.wrapTemplate(content, '/app/main.html');
      expect(newContent).to.endWith('><!--injular-end /app/main.html-->');
    });

    it('should add ie8 line if supportIE8 option is true', function() {
      var content = '<div><span>FOO</span><span>BAR</span</div>';
      var newContent = fileChanger.wrapTemplate(content, '/app/main.html', {
        supportIE8: true
      });
      expect(newContent).to.contain('<!--[if lt IE 9]>');
      expect(newContent).to.contain('<![endif]-->');
    });

  });

  describe('.appendProvideGetter', function() {

    it('should return a string that starts with the string received', function() {
      var content = "angular.module('app').controller(function(){})";
      var newContent = fileChanger.appendProvideGetter(content, 'app');
      expect(newContent).to.startWith(content);
    });

    it('should add $controllerProvider to auxInjular when evaluated', function() {
      var content = fileChanger.appendProvideGetter('', 'app');
      var evaluate = new Function('angular', 'window', content);
      var angular = window.angular.copy(window.angular);

      angular.module('app', []);
      sinon.spy(angular, 'module');
      evaluate(angular, window);
      angular.bootstrap(document.createElement('div'), ['app']);

      expect(angular.module).to.have.callCount(1);
      expect(window.___injular___).to.be.an('object', 'window.___injular___')
      .that.has.property('$controllerProvider');
    });

    it('should add startInjular directive if supportIE8 option is true', function() {
      var content = fileChanger.appendProvideGetter('', 'app', {
        supportIE8: true
      });
      var evaluate = new Function('angular', 'window', content);
      var angular = window.angular.copy(window.angular);

      var module = angular.module('app', []);
      var directive = module.directive = sinon.spy();
      sinon.spy(angular, 'module');
      evaluate(angular, window);
      angular.bootstrap(document.createElement('div'), ['app']);

      expect(directive).to.have.callCount(1);
    });

  });

  describe('.appendAngularModulePatch', function() {

    it('should return a string that starts with the string received', function() {
      var content = "(function(){window.angular={}})()";
      var newContent = fileChanger.appendAngularModulePatch(content);
      expect(newContent).to.startWith(content);
    });

  });

  describe('_appendAngularModulePatchFunction', function() {

    it('should add directivesByUrl to auxInjular when evaluated', function() {
      fileChanger._appendAngularModulePatchFunction(angular, window);

      expect(window.___injular___).to.be.an('object')
      .that.has.property('directivesByUrl')
      .that.deep.equals({});
    });

    it('should add filtersCache to auxInjular when evaluated', function() {
      fileChanger._appendAngularModulePatchFunction(angular, window);

      expect(window.___injular___).to.be.an('object')
      .that.has.property('filtersCache')
      .that.deep.equals({});
    });

    it('should replace angular.module when evaluated', function() {
      var module = angular.module;

      fileChanger._appendAngularModulePatchFunction(angular, window);

      expect(angular.module).to.not.equal(module);
    });

    it('should call original angular.module when evaluated and angular.module is called', function() {
      var module = sinon.spy(angular, 'module');

      fileChanger._appendAngularModulePatchFunction(angular, window);
      angular.module('app');

      expect(module).to.have.callCount(1);
    });

    it('should replace module.directive when evaluated and angular.module is called', function() {
      var directive = angular.module('app', []).directive;
      fileChanger._appendAngularModulePatchFunction(angular, window);
      var module = angular.module('app');

      expect(module.directive).to.not.equal(directive);
    });

    it('should replace module.filter when evaluated and angular.module is called', function() {
      var filter = angular.module('app', []).filter;
      fileChanger._appendAngularModulePatchFunction(angular, window);
      var module = angular.module('app');

      expect(module.filter).to.not.equal(filter);
    });

    it('should not replace module.filter twice when angular.module is called twice', function() {
      fileChanger._appendAngularModulePatchFunction(angular, window);
      var filter = angular.module('app', []).filter;
      var module = angular.module('app');

      expect(module.filter).to.equal(filter);
    });

    it('should call original module.directive with an array factory when new module.directive is called', function() {
      var directive = angular.module('app', []).directive = sinon.spy();
      fileChanger._appendAngularModulePatchFunction(angular, window);
      window.___injular___.addScriptUrlToDirectives('/foo.directive.js');
      angular.module('app').directive('foo', function() {
        return {};
      });

      expect(directive).to.have.callCount(1);
      expect(directive).to.have.been.calledWith('foo');
      expect(directive.args[0][1]).to.be.an('array').that.has.length(1);
    });

    it('should patch the directive factory in order to add the directive to auxInjular.directivesByUrl', function() {
      var directive;
      fileChanger._appendAngularModulePatchFunction(angular, window);
      window.___injular___.addScriptUrlToDirectives('/foo.directive.js');
      var fileDirectives = window.___injular___.directivesByUrl['/foo.directive.js'];
      angular.module('app', []).directive('foo', function() {
        return { foo: 'bar' };
      }).run(function(fooDirective) {
        directive = fooDirective[0];
      });
      bootstrapApp('app');

      expect(directive).to.have.property('foo', 'bar');
      expect(fileDirectives).to.have.property('foo')
      .that.has.property('0', directive);
    });

    it('should transform a postlink function directive to a regular one', function() {
      var directive;
      fileChanger._appendAngularModulePatchFunction(angular, window);
      window.___injular___.addScriptUrlToDirectives('/foo.directive.js');
      var fileDirectives = window.___injular___.directivesByUrl['/foo.directive.js'];
      angular.module('app', []).directive('foo', function() {
        return noop;
      }).run(function(fooDirective) {
        directive = fooDirective[0];
      });
      bootstrapApp('app');

      expect(directive).to.be.an('object');
      expect(fileDirectives).to.have.property('foo')
      .that.has.property('0', directive);
    });

    it('should not add an undefined directive to the directivesByUrl', function() {
      var directives;
      fileChanger._appendAngularModulePatchFunction(angular, window);
      window.___injular___.addScriptUrlToDirectives('/foo.directive.js');
      var fileDirectives = window.___injular___.directivesByUrl['/foo.directive.js'];
      angular.module('app', []).directive('foo', function() {}).run(function(fooDirective) {
        directives = fooDirective;
      }).factory('$exceptionHandler', function() {
        return function() {/*noop*/};
      });
      bootstrapApp('app');

      expect(directives).to.have.length(0);
      expect(fileDirectives).to.have.property('foo')
      .that.has.length(0);
    });

    it('should patch angular.filter with another function that calls the original angular.filter', function() {
      var filterRecipe = angular.module('app', []).filter = sinon.spy();
      fileChanger._appendAngularModulePatchFunction(angular, window);
      angular.module('app').filter('foo', function() {
        return function() { return 'foo'; };
      });

      expect(filterRecipe).to.have.callCount(1);
    });

    it('should patch the filter factory in order to add the filter to auxInjular.filtersCache', function() {
      fileChanger._appendAngularModulePatchFunction(angular, window);
      angular.module('app', []).filter('foo', function() {
        return function() { return 'foo'; };
      }).run(function($filter) {
        $filter('foo');
      });
      bootstrapApp('app');

      expect(window.___injular___).to.be.an('object')
      .that.has.deep.property(
        'filtersCache.foo'
      ).that.is.a('function', '___injular___.filtersCache.foo');
      expect(window.___injular___.filtersCache.foo()).to.equal('foo');
    });

    if (VERSION_MINOR >= 5) {
      it('should patch the component factory in order to add the component to auxInjular.directivesByUrl', function() {
        var component, auxFooFactory;
        fileChanger._appendAngularModulePatchFunction(angular, window);
        window.___injular___.addScriptUrlToDirectives('/foo.component.js');
        var fileDirectives = window.___injular___.directivesByUrl['/foo.component.js'];
        angular.module('app', []).component('foo', {
          require: 'bar',
          template: ['fooFactory', function(fooFactory) {
            auxFooFactory = fooFactory;
          }]
        }).factory('fooFactory', function() {
          return 'FooBar';
        }).run(function(fooDirective) {
          component = fooDirective[0];
        });
        var div = document.createElement('div');
        div.innerHTML = '<foo></foo>';
        angular.bootstrap(div, ['app']);

        expect(component).to.have.property('require', 'bar');
        expect(component).to.have.property('controller').that.is.a('function');
        expect(component).to.have.property('controllerAs', '$ctrl');
        expect(component).to.have.property('template').that.is.a('function');
        expect(auxFooFactory).to.equal('FooBar');
        expect(fileDirectives).to.have.property('foo')
        .that.has.property('0', component);
      });
    }
  });

  describe('.wrapDirectiveFile', function() {

    it('should return a string that includes the given string', function() {
      var content = "angular.module('app').directive('foo', function(){return {};})";
      var newContent = fileChanger.wrapDirectiveFile(content);
      expect(newContent).to.include(content);
    });

    it('should add window.___injular___.directivesByUrl[currentScript.src] when evaluated', function() {
      var content = fileChanger.wrapDirectiveFile('', '/foo.directive.js');
      var evaluate = new Function('window', content);

      fileChanger._appendAngularModulePatchFunction(angular, window);
      evaluate(window);

      expect(window.___injular___.directivesByUrl)
      .to.have.property('/foo.directive.js')
      .that.deep.equals({});
    });

    it('should not add window.___injular___.directivesByUrl[scriptUrl] if it already exists', function() {
      var content = fileChanger.wrapDirectiveFile('', '/foo.directive.js');
      var evaluate = new Function('window', content);

      fileChanger._appendAngularModulePatchFunction(angular, window);
      var fileDirectives = window.___injular___.directivesByUrl['/foo.directive.js'] = {};
      evaluate(window);

      expect(window.___injular___.directivesByUrl)
      .to.have.property('/foo.directive.js')
      .that.equals(fileDirectives);
    });

    it('should set window.___injular___.currentDirectiveUrl only when evaluating', function() {
      var content = fileChanger.wrapDirectiveFile(
        'local.url = window.___injular___.currentDirectiveUrl',
        '/foo.directive.js'
      );
      var evaluate = new Function('window', 'local', content);

      fileChanger._appendAngularModulePatchFunction(angular, window);
      var local = {};
      evaluate(window, local);

      expect(window.___injular___).to.have.property('currentDirectiveUrl', null);
      expect(local).to.have.property('url', '/foo.directive.js');
    });

    it('should set window.___injular___.currentDirectiveUrl to null even when content throws error', function() {
      var content = fileChanger.wrapDirectiveFile('throw new Error()', '/foo.directive.js');
      var evaluate = new Function('window', content);

      fileChanger._appendAngularModulePatchFunction(angular, window);
      try {
        evaluate(window);
      } catch (err) {
        /* noop */
      }

      expect(window.___injular___).to.have.property('currentDirectiveUrl', null);
    });

  });

});
