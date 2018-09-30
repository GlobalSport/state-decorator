import React from 'react';
import { mount } from 'enzyme';
import ContextContainer from '../../src/context/Context';

describe('Context', () => {
  it('handles context correctly', () => {
    const wrapper = mount(<ContextContainer />);

    expect(wrapper.find('.sub-component').text()).toEqual('blue');

    wrapper.find('button').simulate('click');

    expect(wrapper.find('.sub-component').text()).toEqual('red');
  });
});
