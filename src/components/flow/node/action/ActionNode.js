import { fabric } from 'fabric';

import Node, { NODE_COLORS } from '../Node';

const ActionNode = fabric.util.createClass(Node, {
	initialize(options) {
		options = options || {};
		options.fill = NODE_COLORS.ACTION.fill;
		options.stroke = NODE_COLORS.ACTION.border;

		this.callSuper('initialize', options);
	},
});

ActionNode.fromObject = function(options, callback) {
	return callback(new ActionNode(options));
};

window.fabric.ActionNode = ActionNode;

window.fabric.DebugNode = ActionNode;

window.fabric.EmailNode = ActionNode;

export default ActionNode;
