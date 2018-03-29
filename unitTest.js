const VirtualText = require('virtual-dom/vnode/vtext');
const VirtualNode = require('virtual-dom/vnode/vnode');
const VPATCH = require('virtual-dom/vnode/vpatch');
const HtmlRenderedDiff = require('./index');
describe('Unit Test', function() {

    /** Test helper methods **/
    describe('findNode', function() {
        it('should return false when either parameter are falsy', function() {
            expect(HtmlRenderedDiff._findNode(null, null)).toBeFalsy();
            expect(HtmlRenderedDiff._findNode(null, {})).toBeFalsy();
            expect(HtmlRenderedDiff._findNode({}, null)).toBeFalsy();
        });
        it('should return false when sourceNode is a Text Node', function() {
           expect(HtmlRenderedDiff._findNode({}, new VirtualText('hello'))).toBeFalsy();
        });
        it('should return false when nodeToFind is neither a VirtualNode nor a VirtualText', function() {
            expect(HtmlRenderedDiff._findNode({}, new VirtualNode('yo', {}, []))).toBeFalsy();
        });
        it('should return false when it can not find the node', function() {
            // simple case
            let nodeToFind = new VirtualText('find me');
            let sourceNode = new VirtualNode('h1', {}, []);
            expect(HtmlRenderedDiff._findNode(nodeToFind, sourceNode)).toBeFalsy();

            // complicated case
            sourceNode = new VirtualNode('h1', {}, [new VirtualText('1'), new VirtualNode('h1', {}, [new VirtualText('2'), new VirtualNode('h3', {}, [])])]);
            expect((HtmlRenderedDiff._findNode(nodeToFind, sourceNode))).toBeFalsy();
        });
        it('should return an object {foundIn: reference to array where the node was found in, at: the index the node is at}', function() {
            let nodeToFind = new VirtualText('Find me');
            let children = [nodeToFind];
            let sourceNode = new VirtualNode('h1', {}, children);
            let result = HtmlRenderedDiff._findNode(nodeToFind, sourceNode);
            expect(result.at).toEqual(0);
            expect(result.foundIn).toEqual(children);

            // suppose that nodeToFind is at another index
            children.unshift(new VirtualText('dummy node'));
            result = HtmlRenderedDiff._findNode(nodeToFind, sourceNode);
            expect(result.at).toEqual(1);
            expect(result.foundIn).toEqual(children);

            // suppose that nodeToFind is deep inside sourceNode
            sourceNode = new VirtualNode('h1', {}, [new VirtualText('sibling'), new VirtualNode('p', {}, children)]);
            result = HtmlRenderedDiff._findNode(nodeToFind, sourceNode);
            expect(result.at).toEqual(1);
            expect(result.foundIn).toEqual(children);

            // suppose that nodeToFind is a VirtualNode instead of VirtualText
            nodeToFind = new VirtualNode('h2', {}, []);
            children.push(nodeToFind);
            result = HtmlRenderedDiff._findNode(nodeToFind, sourceNode);
            expect(result.at).toEqual(2);
            expect(result.foundIn).toEqual(children);
        });
    });

    describe('deepCopyProperties', function() {
        it('should return false if either parameter is falsy', function() {
            let fromHere;
            let toHere;
            expect(HtmlRenderedDiff._deepCopyProperties(fromHere, toHere)).toBeFalsy();
            toHere = {};
            expect(HtmlRenderedDiff._deepCopyProperties(fromHere, toHere)).toBeFalsy();
            toHere = undefined;
            fromHere = {};
            expect(HtmlRenderedDiff._deepCopyProperties(fromHere, toHere)).toBeFalsy();
        });
        it('should return true and copy properties correctly', function() {
            let fromHere = {
                style: 'cool',
                src: 'srcUrl',
                attributes: {
                    class: "classA",
                    value: 'hello',
                    inner: {
                        nested: 'wow'
                    }

                }
            };
            let toHere = {};
            let result = HtmlRenderedDiff._deepCopyProperties(fromHere, toHere);
            expect(result).toBeTruthy();
            expect(toHere.style).toEqual(fromHere.style);
            expect(toHere.src).toEqual(fromHere.src);
            expect(toHere.attributes.class).toEqual(fromHere.attributes.class);
            expect(toHere.attributes.value).toEqual(fromHere.attributes.value);
            expect(toHere.attributes.inner.nested).toEqual(fromHere.attributes.inner.nested);
        });
    });

    describe('containsAllowedProps', function() {
       it('should return false if the parameter is not an object', function() {
          expect(HtmlRenderedDiff._containsAllowedProps(null)).toBeFalsy();
       });
       it('should return false if the parameter is an object containing none of the properties we care about (style, src, href, class)', function() {
          expect(HtmlRenderedDiff._containsAllowedProps({})).toBeFalsy();
       });
       it('should return true if the parameter is an object containing at least one of properties we care about (style, src, href, class)', function() {
          expect(HtmlRenderedDiff._containsAllowedProps({style: 'display: none'})).toBeTruthy();
           expect(HtmlRenderedDiff._containsAllowedProps({src: 'url'})).toBeTruthy();
           expect(HtmlRenderedDiff._containsAllowedProps({href: 'link'})).toBeTruthy();
           expect(HtmlRenderedDiff._containsAllowedProps({attributes: {class: 'hello'}})).toBeTruthy();
       });
    });

    describe('hasFurtherChanges', function() {
        it('should return true if the parameter is not a VirtualNode', function() {
            expect(HtmlRenderedDiff._hasFurtherChanges({}, [])).toBeFalsy();
        });
        it('should return true if the parameter node has no children', function() {
            expect(HtmlRenderedDiff._hasFurtherChanges(new VirtualNode('b', {}, [])), []).toBeFalsy();
        });
        it('should return true if the parameter node descendants are not affected by any patches', function() {
            expect(HtmlRenderedDiff._hasFurtherChanges(new VirtualNode('b', {}, [new VirtualNode('e', {}, [])]), [{key: 0, vNode: new VirtualNode('e', {}, [])}])).toBeFalsy();
        });
        it('should return false if the any of the node descendant is affected by other patches', function() {
            // simple case
            let child = new VirtualText('hi');
            let nodeToPatch = new VirtualNode('c', {}, [child]);
            let allNodesRequiredPatch = [child];
            expect(HtmlRenderedDiff._hasFurtherChanges(nodeToPatch, allNodesRequiredPatch)).toBeTruthy();

            // complicated case
            nodeToPatch = new VirtualNode('a', {}, [new VirtualNode('a', {}, [new VirtualNode('e', {}, [child]), new VirtualText('sdf')]), new VirtualText('z')]);
            expect(HtmlRenderedDiff._hasFurtherChanges(nodeToPatch, allNodesRequiredPatch)).toBeTruthy();
        });
    });

    describe('getNodesNeedPatching', function() {
        it('should return empty array if the parameter is not valid', function () {
            let result = HtmlRenderedDiff._getNodesNeedPatching(null);
            expect(result.length === 0).toBeTruthy();
            result = HtmlRenderedDiff._getNodesNeedPatching([]);
            expect(result.length === 0).toBeTruthy();
        });
        it('should return an array of nodes that needs patches', function() {
            let nodeNeedPatching1 = new VirtualText('node to patch');
            let nodeNeedPatching2 = new VirtualNode('p', {}, []);
            let nodeNeedPatching3 = new VirtualNode('div', {}, []);
            let patches = {
                0: {
                    type: VPATCH.VNODE,
                    vNode: nodeNeedPatching1,
                    patch: new VirtualNode('p', {}, [])
                },
                // there are cases where the value is an array( Properties Patch followed immediately by an insertion patch
                1: [
                    {
                        type: VPATCH.PROPS,
                        vNode: nodeNeedPatching2,
                        patch: new VirtualNode('p', {'src': 'new src url'}, [])
                    },
                    {
                        type: VPATCH.INSERT,
                        vNode: nodeNeedPatching3,
                        patch: new VirtualText('insert me')
                    }
                ]
            };

            let result = HtmlRenderedDiff._getNodesNeedPatching(patches);
            expect(result.length === 3).toBeTruthy();
            expect(result[0]).toEqual(nodeNeedPatching1);
            expect(result[1]).toEqual(nodeNeedPatching2);
            expect(result[2]).toEqual(nodeNeedPatching3);
        });
    });

    /** Test applyPatch methods **/
    describe('applyVNodePatch', function() {
        it('the patch is done later down the tree', function() {
            let nodeToAdd = new VirtualNode('p', {}, []);
            let nodeToRemove = new VirtualText('div', {}, []);
            let patch = {
                vNode: nodeToRemove,
                patch: nodeToAdd
            };
            let originalTree = new VirtualNode('p', {}, [nodeToRemove]);
            HtmlRenderedDiff._applyVNodePatch(patch, originalTree);
            expect(originalTree.children[0].properties.attributes.class).toEqual('patcher-replaceOut');
            expect(originalTree.children[0].children[0]).toEqual(nodeToRemove);
            expect(originalTree.children[1].properties.attributes.class).toEqual('patcher-replaceIn');
            expect(originalTree.children[1].children[0]).toEqual(nodeToAdd);
        });
    });

    describe('applyVTextPatch', function() {
       it('case1: the patch is done for VTEXT against VNODE', function() {
           let nodeToAdd = new VirtualText('add me');
           let nodeToRemove = new VirtualNode('p', {}, []);
           let originalTree = new VirtualNode('div', {}, [nodeToRemove]);
           let patch = {
               vNode: nodeToRemove,
               patch: nodeToAdd
           };
           HtmlRenderedDiff._applyVTextPatch(patch, originalTree);
           expect(originalTree.children[0].properties.attributes.class).toEqual('patcher-replaceOut');
           expect(originalTree.children[0].children[0]).toEqual(nodeToRemove);
           expect(originalTree.children[1].properties.attributes.class).toEqual('patcher-replaceIn');
           expect(originalTree.children[1].children[0]).toEqual(nodeToAdd);
       });

       it('case2: the patch is done for VTEXT against VTEXT ( text-diff )', function() {
           let nodeToAdd = new VirtualText('apple juice');
           let nodeToRemove = new VirtualText('apple cake');
           let originalTree = new VirtualNode('div', {}, [nodeToRemove]);
           let patch = {
               vNode: nodeToRemove,
               patch: nodeToAdd
           };
           HtmlRenderedDiff._applyVTextPatch(patch, originalTree);
           expect(originalTree.children[0].properties.attributes.class).toEqual('patcher-text-diff');
           // for each text diff, there should be a wrapper on top of it
           let textDiffResult = originalTree.children[0].children;
           expect(textDiffResult[0].properties.attributes.class).toEqual('patcher-text-same');
           expect(textDiffResult[0].children[0].text).toEqual('apple ');
           expect(textDiffResult[1].children[0].text).toEqual('cake');
           expect(textDiffResult[2].children[0].text).toEqual('juice');
       });
    });

    describe('applyInsertPatch', function() {
       it('should not wrap nodeToInsert since it is a VirutalNode', function() {
            let nodeToInsert = new VirtualNode('p', {src: 'hi', attributes: {class:'hi'}}, []);
            let originalTree = new VirtualNode('div', {}, []);
            let patch = {
                patch: nodeToInsert,
                vNode: originalTree
            };
            HtmlRenderedDiff._applyInsertPatch(patch);
            expect(nodeToInsert.properties.src).toEqual('hi');
            expect(nodeToInsert.properties.attributes.class).toEqual('hi patcher-insert');
       });
    });

    describe('applyRemovePatch', function() {
        it('should delete node at the right place', function() {
            let nodeToDelete = new VirtualText('delete me');
            let patch = {
                vNode: nodeToDelete
            };
            let originalTree = new VirtualNode('h2', {}, [nodeToDelete]);
            HtmlRenderedDiff._applyRemovePatch(patch, originalTree);
            expect(originalTree.children[0].properties.attributes.class).toEqual('patcher-delete');
            expect(originalTree.children[0].children[0]).toEqual(nodeToDelete);
        });
    });

    describe('applyVPropsPatch', function() {
        it('should not wrap this node when at least one of its children is affected by other patches ( but do patch the override the properties', function() {
            let nodeToPatchChild = new VirtualText('hi');
            let nodeToPatch = new VirtualNode('p', {src: 'original src', attributes: {class: 'old class name'}}, [nodeToPatchChild]);
            let originalTree = new VirtualNode('div', {}, [nodeToPatch]);
            let allNodeRequiredToPatch = [nodeToPatch, nodeToPatchChild];
            let patch = {
                vNode: nodeToPatch,
                patch: {
                    src: 'new src' ,
                    attributes: {class: 'new class name'}
                }
            };
            HtmlRenderedDiff._applyVPropsPatch(patch, originalTree, allNodeRequiredToPatch);
            expect(originalTree.children[0]).toEqual(nodeToPatch);
            expect(nodeToPatch.properties['src']).toEqual('new src');
            expect(nodeToPatch.properties.attributes.class).toEqual('new class name');
        });

        it('should wrap this node when none of its children are affected by other patches', function() {
            let nodeToPatchChild = new VirtualText('hi');
            let nodeToPatch = new VirtualNode('p', {src: 'original src', attributes: {class: 'old class name'}}, [nodeToPatchChild]);
            let originalTree = new VirtualNode('div', {}, [nodeToPatch]);
            let allNodeRequiredToPatch = [nodeToPatch];
            let patch = {
                vNode: nodeToPatch,
                patch: {
                    src: 'new src' ,
                    attributes: {class: 'new class name'}
                }
            };
            HtmlRenderedDiff._applyVPropsPatch(patch, originalTree, allNodeRequiredToPatch);
            expect(originalTree.children[0].properties.attributes.class).toEqual('patcher-attribute-replace-out');
            expect(originalTree.children[1].properties.attributes.class).toEqual('patcher-attribute-replace-in');
            let nodeToPatchOriginal = originalTree.children[0].children[0];
            expect(nodeToPatchOriginal.properties.src).toEqual('original src');
            expect(nodeToPatchOriginal.properties.attributes.class).toEqual('old class name');
            let nodeToPatchAfter = originalTree.children[1].children[0];
            expect(nodeToPatchAfter).toEqual(nodeToPatch);
            expect(nodeToPatchAfter.properties.src).toEqual('new src');
            expect(nodeToPatchAfter.properties.attributes.class).toEqual('new class name');
        });
    });
});
