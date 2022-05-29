var Lucia = (function (exports) {
  'use strict';

  const DIRECTIVE_PREFIX = 'l-';
  const COMPONENT_FLAG = 'component';
  const FOR_TEMPLATE_FLAG = '__for_template';
  const MODEL_REGISTERED_FLAG = '__model_registered';
  var DIRECTIVE_SHORTHANDS;
  (function (DIRECTIVE_SHORTHANDS) {
      DIRECTIVE_SHORTHANDS["@"] = "on";
      DIRECTIVE_SHORTHANDS[":"] = "bind";
  })(DIRECTIVE_SHORTHANDS || (DIRECTIVE_SHORTHANDS = {}));

  var ASTNodeType;
  (function (ASTNodeType) {
      ASTNodeType[ASTNodeType["NULL"] = -1] = "NULL";
      ASTNodeType[ASTNodeType["STATIC"] = 0] = "STATIC";
      ASTNodeType[ASTNodeType["DYNAMIC"] = 1] = "DYNAMIC";
  })(ASTNodeType || (ASTNodeType = {}));

  const error = (err, expression, el) => {
      let message = `Lucia Error: "${err}"`;
      if (expression)
          message += `\n\nExpression: "${expression}"`;
      if (el)
          message += `\nElement:`;
      console.warn(message, el);
  };

  const computeExpression = (expression, el, returnable = true, refs = {}) => {
      const formattedExpression = `${returnable ? `return ${expression}` : expression}`;
      const specialPropertiesNames = ['$state', '$el', '$emit', '$event', '$refs'];
      // This "revives" a function from a string, only using the new Function syntax once during compilation.
      // This is because raw function is ~50,000x faster than new Function
      const computeFunction = new Function(`return (${specialPropertiesNames.join(',')})=>{with($state){${formattedExpression}}}`)();
      const emit = (name, options, dispatchGlobal = true) => {
          const event = new CustomEvent(name, options);
          /* istanbul ignore next */
          const target = dispatchGlobal ? window : el || window;
          target.dispatchEvent(event);
      };
      return (state, event) => {
          try {
              const value = state[expression];
              if (value) {
                  return typeof value === 'function' ? value.bind(state)() : value;
              }
              else {
                  return computeFunction(state, el, emit, event, refs);
              }
          }
          catch (err) {
              error(err, expression, el);
          }
      };
  };

  // Split directive:modifier.property
  const rawDirectiveSplitRE = () => /:|\./gim;
  const eventDirectivePrefixRE = () => /on|@/gim;
  const parenthesisWrapReplaceRE = () => /\(|\)/gim;
  const hasDirectiveRE = () => {
      return new RegExp(`(${DIRECTIVE_PREFIX}|${Object.keys(DIRECTIVE_SHORTHANDS).join('|')})\\w+`, 'gim');
  };
  const expressionPropRE = (prop) => {
      // Utilizes \b (word boundary) for prop differentiation.
      // Fails when next character is a \w (Word).
      return new RegExp(`\\b${prop}\\b`, 'gim');
  };

  const removeDupesFromArray = (array) => {
      return [...new Set(array)];
  };

  const isListRenderScope = (el) => {
      return el.hasAttribute(`${DIRECTIVE_PREFIX}for`);
  };
  const isUnderListRenderScope = (el) => {
      return !!el.parentElement && el.parentElement.hasAttribute(`${DIRECTIVE_PREFIX}for`);
  };
  const createASTNode = (el, state) => {
      const [directives, deps] = collectAndInitDirectives(el, state);
      const hasDirectives = Object.keys(directives).length > 0;
      const hasDepInDirectives = Object.values(directives).some(({ value }) => Object.keys(state).some((prop) => expressionPropRE(prop).test(value)));
      const type = hasDepInDirectives ? ASTNodeType.DYNAMIC : ASTNodeType.STATIC;
      const node = { el, deps, directives, type };
      return hasDirectives ? node : undefined;
  };
  const collectRefs = (element = document) => {
      const refDirective = `${DIRECTIVE_PREFIX}ref`;
      const refElements = element.querySelectorAll(`[${refDirective}]`);
      const refs = {};
      refElements.forEach((refElement) => {
          const name = refElement.getAttribute(refDirective);
          /* istanbul ignore next */
          if (name)
              refs[name] = refElement;
      });
      return refs;
  };
  /* istanbul ignore next */
  const collectAndInitDirectives = (el, state = {}) => {
      const directives = {};
      const refs = collectRefs();
      const nodeDeps = [];
      for (const { name, value } of el.attributes) {
          const isStateDirective = name === `${DIRECTIVE_PREFIX}state`;
          const hasDirectivePrefix = name.startsWith(DIRECTIVE_PREFIX);
          const hasDirectiveShorthandPrefix = Object.keys(DIRECTIVE_SHORTHANDS).some((shorthand) => name.startsWith(shorthand));
          if (isStateDirective || !(hasDirectivePrefix || hasDirectiveShorthandPrefix))
              continue;
          const depsInFunctions = [];
          const propsInState = Object.keys(state);
          let returnable = true;
          // Finds the dependencies of a directive expression
          const deps = propsInState.filter((prop) => {
              const hasDep = expressionPropRE(prop).test(String(value));
              // Check for dependencies inside functions
              /* istanbul ignore next */
              if (hasDep && typeof state[prop] === 'function') {
                  const depsInFunction = propsInState.filter((p) => {
                      return expressionPropRE(p).test(String(state[prop]));
                  });
                  depsInFunctions.push(...depsInFunction);
              }
              return hasDep;
          });
          if (eventDirectivePrefixRE().test(name))
              returnable = false;
          // for directive requires a template
          if (name.includes('for') && el[FOR_TEMPLATE_FLAG] === undefined) {
              el[FOR_TEMPLATE_FLAG] = String(el.innerHTML).trim();
              returnable = false;
          }
          const uniqueCompiledDeps = removeDupesFromArray([...deps, ...depsInFunctions]);
          nodeDeps.push(...uniqueCompiledDeps);
          const directiveData = {
              compute: computeExpression(value, el, returnable, refs),
              deps: uniqueCompiledDeps,
              value,
          };
          // Handle normal and shorthand directives
          /* istanbul ignore next */
          const directiveName = hasDirectivePrefix
              ? name.slice(DIRECTIVE_PREFIX.length)
              : `${DIRECTIVE_SHORTHANDS[name[0]]}:${name.slice(1)}`;
          directives[directiveName.toLowerCase()] = directiveData;
      }
      return [directives, removeDupesFromArray(nodeDeps)];
  };
  const flattenElementChildren = (rootElement, isListGroup = false, ignoreRootElement = false) => {
      const collection = [];
      const isList = isListRenderScope(rootElement);
      const isUnderList = isUnderListRenderScope(rootElement);
      // Return nothing if it isn't list compilation and is a list or under a list
      if (!isListGroup && (isList || isUnderList))
          return collection;
      // Add root elem to return array if it isn't a list or under a list
      if (!ignoreRootElement && (!isListGroup || !isList))
          collection.push(rootElement);
      // Is not a list or under a list, but pass if is a list group
      /* istanbul ignore next */
      if (isListGroup || (!isList && !isUnderList)) {
          for (const childElement of rootElement.children) {
              // Check if childElement has attributes
              if (childElement instanceof HTMLElement) {
                  if (!isListGroup && isListRenderScope(childElement)) {
                      // Push root if it is a list render (don't want to push unrendered template)
                      collection.push(childElement);
                  }
                  else {
                      // Skip over nested components (independent compile request)
                      if (childElement.hasAttribute(`${DIRECTIVE_PREFIX}state`))
                          continue;
                      // Push all children into array (recursive flattening)
                      collection.push(...flattenElementChildren(childElement, isListGroup, childElement.attributes.length === 0));
                  }
              }
          }
      }
      return collection;
  };
  const compile = (el, state, ignoreRootElement = false) => {
      const ast = [];
      const isListGroup = el[COMPONENT_FLAG] !== undefined && isListRenderScope(el);
      const elements = flattenElementChildren(el, isListGroup, ignoreRootElement);
      /* istanbul ignore next */
      elements.forEach((element) => {
          if (hasDirectiveRE().test(element.outerHTML)) {
              const newASTNode = createASTNode(element, state);
              if (newASTNode) {
                  ast.push(newASTNode);
              }
          }
      });
      return ast;
  };

  const formatAcceptableWhitespace = (expression) => {
      const whitespaceRE = /\s+/gim;
      return expression.replace(whitespaceRE, ' ').trim();
  };
  const bindDirective = ({ el, parts, data, state }) => {
      switch (parts[1]) {
          case 'class': {
              const classes = data.compute(state);
              const removeDynamicClassesRE = new RegExp(`\\b${Object.keys(classes).join('|')}\\b`, 'gim');
              const rawClasses = el.className.replace(removeDynamicClassesRE, '');
              // Accept just providing classes regularly
              if (typeof classes === 'string') {
                  el.className = formatAcceptableWhitespace(`${rawClasses} ${classes}`);
                  // Accept providing an array of classes and appending them
              }
              else if (Array.isArray(classes)) {
                  el.className = formatAcceptableWhitespace(`${rawClasses} ${classes.join(' ')}`);
              }
              else {
                  // Accept binding classes on/off based off of boolean state value
                  const activeClasses = [];
                  Object.entries(classes).forEach(([className, classValue]) => {
                      if (classValue)
                          activeClasses.push(className);
                  });
                  if (activeClasses.length > 0) {
                      el.className = formatAcceptableWhitespace(`${rawClasses} ${activeClasses.join(' ')}`);
                  }
                  else if (formatAcceptableWhitespace(rawClasses).length > 0) {
                      el.className = formatAcceptableWhitespace(rawClasses);
                  }
                  else {
                      el.className = '';
                      el.removeAttribute('class');
                  }
              }
              break;
          }
          case 'style': {
              // Accept object and set properties based on boolean state value
              const styles = data.compute(state);
              if (el.hasAttribute('style'))
                  el.removeAttribute('style');
              Object.entries(styles).forEach(([styleName, styleValue]) => {
                  el.style[styleName] = styleValue;
              });
              break;
          }
          default: {
              // Bind arbitrary attributes based on boolean state value
              const attributes = data.compute(state);
              // Allow object syntax in binding without modifier
              if (typeof attributes === 'object' && attributes !== null) {
                  Object.entries(attributes).forEach(([name, value]) => {
                      // Only set attr if not falsy
                      if (value) {
                          el.setAttribute(name, value);
                      }
                      else {
                          el.removeAttribute(name);
                      }
                  });
              }
              else if (attributes) {
                  el.setAttribute(parts[1], attributes);
              }
              else {
                  if (el.hasAttribute(parts[1]))
                      el.removeAttribute(parts[1]);
              }
              break;
          }
      }
  };

  // Lazy allows us to delay render calls if the main thread is blocked
  // This is kind of like time slicing in React but less advanced
  /* istanbul ignore file */
  const lazy = (threshold, generatorFunction) => {
      const generator = generatorFunction();
      return function next() {
          const start = performance.now();
          let task = null;
          do {
              task = generator.next();
          } while (performance.now() - start < threshold && !task.done);
          if (task.done)
              return;
          setTimeout(next);
      };
  };

  const render = (ast, directives, state, changedProps) => {
      const legalDirectiveNames = Object.keys(directives);
      const LAZY_MODE_TIMEOUT = 25;
      lazy(LAZY_MODE_TIMEOUT, function* () {
          /* istanbul ignore next */
          for (const node of ast) {
              if (node.type === ASTNodeType.NULL)
                  continue;
              const isStatic = node.type === ASTNodeType.STATIC;
              if (isStatic)
                  node.type = ASTNodeType.NULL;
              yield;
              const nodeHasDep = changedProps.some((prop) => node.deps.includes(prop));
              if (!nodeHasDep && !isStatic)
                  continue;
              for (const [directiveName, directiveData] of Object.entries(node.directives)) {
                  const rawDirectiveName = directiveName.split(rawDirectiveSplitRE())[0];
                  // Validate if it is a legal directive
                  if (!legalDirectiveNames.includes(rawDirectiveName.toUpperCase()))
                      continue;
                  yield;
                  // Iterate through affected and check if directive value has prop
                  const directiveHasDep = directiveData.deps.length === node.deps.length ||
                      changedProps.some((prop) => directiveData.deps.includes(prop));
                  const isStaticDirective = directiveData.deps.length === 0;
                  // If affected, then push to render queue
                  if (directiveHasDep || isStatic || isStaticDirective) {
                      const directiveProps = {
                          el: node.el,
                          parts: directiveName.split(rawDirectiveSplitRE()),
                          data: directiveData,
                          node,
                          state,
                      };
                      renderDirective(directiveProps, directives);
                      if (isStaticDirective) {
                          delete node.directives[directiveName];
                      }
                  }
              }
          }
      })();
  };

  const rewriteWithNewDeps = (ast, currentDeps, node, directiveName) => {
      const deps = [];
      ast.forEach((node) => {
          deps.push(...node.deps);
      });
      const cleanedDeps = removeDupesFromArray([...currentDeps, ...deps]);
      // Update deps for directive
      node.deps = cleanedDeps;
      node.directives[directiveName].deps = cleanedDeps;
  };

  // This directive is size-based, not content-based, since everything is compiled and rerendered
  // It's also quite expensive on performance, and should be refactored in the future
  const forDirective = ({ el, data, state, node }) => {
      const originalAST = el[COMPONENT_FLAG];
      if (!originalAST)
          el[COMPONENT_FLAG] = compile(el, state);
      const forLoopRE = /\s+(?:in|of)\s+/gim;
      const [expression, target] = data.value.split(forLoopRE);
      const [item, index] = expression?.trim().replace(parenthesisWrapReplaceRE(), '').split(',');
      // Try to grab by property, else compute it if it's a custom array
      const currArray = state[target?.trim()] ?? computeExpression(target?.trim(), el, true)(state);
      const template = el[FOR_TEMPLATE_FLAG];
      if (el.innerHTML.trim() === template)
          el.innerHTML = '';
      // This just checks if there is deviation from both (removal/addition/nochange)
      const arrayDiff = currArray?.length - el.children.length;
      const tableElementRE = /^[^\S]*?<(t(?:head|body|foot|r|d|h))/i;
      if (currArray?.length === 0)
          el.innerHTML = '';
      else if (arrayDiff !== 0) {
          for (let i = Math.abs(arrayDiff); i > 0; --i) {
              if (arrayDiff < 0)
                  el.removeChild(el.lastChild);
              else {
                  let content = String(template);
                  const isTable = tableElementRE.test(content);
                  /* istanbul ignore next */
                  if (item) {
                      content = content.replace(expressionPropRE(`this\\.${item.trim()}`), `${target}[${currArray.length - i}]`);
                  }
                  if (index) {
                      content = content.replace(expressionPropRE(`this\\.${index.trim()}`), String(currArray.length - i));
                  }
                  // Needing to wrap table elements, else they disappear
                  if (isTable)
                      content = `<table>${content}</table>`;
                  const fragment = document.createRange().createContextualFragment(content);
                  // fragment and fragment.firstElementChild return the same result
                  // so we have to do it two times for the table, since we need
                  // to unwrap the temporary wrap
                  // @ts-expect-error: firstElementChild will exist since <table> exists
                  el.appendChild(isTable ? fragment.firstElementChild.firstElementChild : fragment);
              }
          }
          el[COMPONENT_FLAG] = compile(el, state);
      }
      if (!originalAST) {
          // Deps recompiled because child nodes may have additional deps
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          rewriteWithNewDeps(el[COMPONENT_FLAG], data.deps, node, 'for');
          el.removeAttribute(`${DIRECTIVE_PREFIX}for`);
      }
      // Only recompile if there is no increase/decrease in array size, else use the original AST
      const ast = arrayDiff === 0 ? originalAST : compile(el, state, true);
      /* istanbul ignore next */
      render(ast || [], directives, state, node?.deps || []);
  };

  const htmlDirective = ({ el, data, state, node }) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      node = node;
      const marker = el[COMPONENT_FLAG];
      /* istanbul ignore next */
      const ret = data.compute(state) ?? data.value;
      /* istanbul ignore next */
      if (ret !== el.innerHTML) {
          el.innerHTML = ret;
          /* istanbul ignore next */
          if (hasDirectiveRE().test(ret)) {
              const ast = marker ?? compile(el, state, true);
              if (!marker)
                  rewriteWithNewDeps(ast, data.deps, node, 'html');
              render(ast, directives, state, data.deps);
              el[COMPONENT_FLAG] = ast;
          }
      }
  };

  const inputCallback = (el, hydratedValue, data, state) => {
      /* istanbul ignore next */
      if (el.type === 'checkbox') {
          /* istanbul ignore next */
          el.value = String(el.checked);
      }
      // @ts-expect-error: el.value can be any type, but isNaN only accepts number
      const isNumber = typeof hydratedValue === 'number' && !isNaN(el.value);
      const isBoolean = typeof hydratedValue === 'boolean' && (el.value === 'true' || el.value === 'false');
      const isNullish = (hydratedValue === null || hydratedValue === undefined) &&
          (el.value === 'null' || el.value === 'undefined');
      // Perform type coercion
      let payload;
      if (isNumber) {
          payload = Number(el.value);
      }
      else if (isBoolean) {
          payload = el.value === 'true';
      }
      else if (isNullish) {
          if (el.value === 'null')
              payload = null;
          else
              payload = undefined;
      }
      else {
          payload = String(el.value);
      }
      /* istanbul ignore next */
      if (state[data.value]) {
          state[data.value] = payload;
      }
      else {
          payload = typeof payload === 'string' ? `'${payload}'` : payload;
          computeExpression(`${data.value} = ${payload}`, el, true)(state);
      }
      return payload;
  };
  /* istanbul ignore next */
  const modelDirective = ({ el: awaitingTypecastEl, parts, data, state, }) => {
      const el = awaitingTypecastEl;
      const hydratedValue = state[data.value] ?? computeExpression(data.value, el, true)(state);
      const accessor = el.type === 'checkbox' ? 'checked' : 'value';
      if (el[accessor] !== String(hydratedValue)) {
          el[accessor] = hydratedValue;
      }
      if (!el[MODEL_REGISTERED_FLAG]) {
          const callback = () => inputCallback(el, hydratedValue, data, state);
          el.addEventListener(parts[1] === 'debounce' ? 'change' : 'input', callback);
          el[MODEL_REGISTERED_FLAG] = true;
      }
  };

  const onDirective = ({ el, parts, data, state }) => {
      const options = {};
      const globalScopeEventProps = ['outside', 'global'];
      const eventProps = parts.slice(2);
      const EVENT_REGISTERED_FLAG = `__on_${parts[1]}_registered`;
      if (el[EVENT_REGISTERED_FLAG])
          return;
      const target = globalScopeEventProps.some((prop) => String(eventProps).includes(prop))
          ? window
          : el;
      /* istanbul ignore next */
      const handler = (event) => {
          if (event instanceof KeyboardEvent && /\d/gim.test(String(eventProps))) {
              const whitelistedKeycodes = [];
              eventProps.forEach((eventProp) => {
                  // @ts-expect-error: eventProp can be a string, but isNaN only accepts number
                  if (!isNaN(eventProp)) {
                      whitelistedKeycodes.push(Number(eventProp));
                  }
              });
              if (!whitelistedKeycodes.includes(event.keyCode))
                  return;
          }
          // Parse event modifiers based on directive prop
          if (eventProps.includes('prevent'))
              event.preventDefault();
          if (eventProps.includes('stop'))
              event.stopPropagation();
          if (eventProps.includes('self')) {
              if (event.target !== el)
                  return;
          }
          /* istanbul ignore next */
          if (eventProps.includes('outside')) {
              if (el.contains(event.target))
                  return;
              if (el.offsetWidth < 1 && el.offsetHeight < 1)
                  return;
          }
          data.compute(state, event);
      };
      options.once = eventProps.includes('once');
      options.passive = eventProps.includes('passive');
      target.addEventListener(parts[1], handler, options);
      el[EVENT_REGISTERED_FLAG] = true;
  };

  const showDirective = ({ el, data, state }) => {
      const ret = data.compute(state);
      /* istanbul ignore next */
      if (ret !== el.style.display)
          el.style.display = ret ? '' : 'none';
      if (el.style.length === 0)
          el.removeAttribute('style');
  };

  const textDirective = ({ el, data, state }) => {
      const ret = data.compute(state) ?? data.value;
      /* istanbul ignore next */
      if (ret !== el.textContent) {
          el.textContent = ret;
      }
  };

  const directives = {
      BIND: bindDirective,
      HTML: htmlDirective,
      MODEL: modelDirective,
      SHOW: showDirective,
      ON: onDirective,
      TEXT: textDirective,
      FOR: forDirective,
  };
  const renderDirective = (props, directives) => {
      directives[props.parts[0].toUpperCase()](props);
  };

  const arrayEquals = (firstArray, secondArray) => {
      // Deep Array equality check
      return (Array.isArray(firstArray) &&
          Array.isArray(secondArray) &&
          firstArray.length === secondArray.length &&
          firstArray.every((value, i) => value === secondArray[i]));
  };
  const reactive = (state, render) => {
      const supportedObjectTypes = ['Object', 'Array'].map((type) => `[object ${type}]`);
      const handler = {
          get(target, key) {
              const ret = target[key];
              if (typeof ret === 'object' && ret !== null) {
                  const objectType = Object.prototype.toString.call(ret);
                  if (supportedObjectTypes.includes(objectType)) {
                      // Deep proxy - if there is an object in an object, need to proxify that.
                      return new Proxy(ret, handler);
                  }
                  else {
                      error(`Data type ${objectType} is not supported`);
                      return ret;
                  }
              }
              else {
                  return ret;
              }
          },
          set(target, key, value) {
              // Currently double renders - bad perf
              const hasArrayMutationKey = !isNaN(Number(key)) || key === 'length';
              const props = hasArrayMutationKey ? [] : [key];
              if (Array.isArray(target) && hasArrayMutationKey) {
                  const keys = Object.keys(state).filter((prop) => {
                      return (
                      // Find the array that equals the target
                      Array.isArray(state[prop]) && arrayEquals(state[prop], target));
                  });
                  props.push(...keys);
              }
              else {
                  // For this case, we don't know if the key is on the global state,
                  // So we need to check if it is a nested object:
                  if (!Object.is(target, state)) {
                      const keys = Object.keys(state).filter((prop) => {
                          return (
                          // Lazy way of checking if key exists under one layer down nested objects
                          Object.prototype.toString.call(state[prop]) === '[object Object]' &&
                              JSON.stringify(state[prop]).indexOf(key) > -1);
                      });
                      props.push(...keys);
                  }
              }
              target[key] = value;
              render(props);
              return true;
          },
      };
      // State is sealed, meaning values are mutable, but size is immutable
      return new Proxy(Object.seal(state), handler);
  };

  /**
   * Holds state and AST, runs directives and renders content
   * Do not instantiate this directly, rather use the `component`
   * function to generate a Component.
   * @property {State} state - The data that pertains to the Component
   * @property {ASTNode[]} ast - The Abstract Syntax Tree that models the HTML
   */
  class Component {
      state = Object.seal({});
      ast = [];
      constructor(state) {
          this.ast = [];
          this.state = state;
      }
      /**
       * Initialize the component
       * @param {HTMLElement|string} el - Component element root
       * @returns {undefined}
       */
      mount(el) {
          // Accepts both selector and element reference
          const rootEl = el instanceof HTMLElement ? el : document.querySelector(el) || document.body;
          const finalState = { ...this.state, $render: this.render.bind(this) };
          this.ast = compile(rootEl, this.state);
          this.state = reactive(finalState, this.render.bind(this));
          this.render();
          rootEl[COMPONENT_FLAG] = this;
      }
      /**
       * Force renders the DOM based on props
       * @param {string[]=} props - Array of root level properties in state
       * @returns {undefined}
       */
      render(props = Object.keys(this.state)) {
          render(this.ast, directives, this.state, props);
      }
  }
  /**
   * Instantiates and returns a Component class. NOTE: components may
   * only be mounted once on one element.
   * @param {State} state - The data that pertains to the Component
   * @returns {Component}
   */
  const component = (state) => new Component(state);

  /**
   * Initialize components defined in HTML with `l-state`
   * @param {HTMLElement|Document} element - Root element to find uninitialized components
   */
  const init = (element = document) => {
      const stateDirective = `${DIRECTIVE_PREFIX}state`;
      const componentElements = element.querySelectorAll(`[${stateDirective}]`);
      const uninitializedComponents = [...componentElements].filter((el) => !el[COMPONENT_FLAG]);
      uninitializedComponents.forEach((uninitializedComponent) => {
          const stateExpression = uninitializedComponent.getAttribute(stateDirective);
          const state = new Function(`return ${stateExpression}`)() || {};
          const currentComponent = component(state);
          currentComponent.mount(uninitializedComponent);
      });
  };
  document.addEventListener('DOMContentLoaded', () => {
      console.log('💖 Support Lucia: https://github.com/aidenybai/lucia?sponsor=1\nℹ️ Want to get rid of this message? Use the production build.');
      init();
  });

  exports.component = component;
  exports.init = init;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
