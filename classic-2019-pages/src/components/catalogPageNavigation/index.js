import React from 'react';
import { createUseStyles } from 'react-jss';
import CatalogPageStore from '../../stores/catalogPage';
import Dropdown from '../dropdown';

const navigationItems = [
  {
    id: 'Featured',
    name: 'Featured',
    clickData: 'Featured,',
    children: {
      title: 'Featured Types',
      children: [
        { name: 'All Featured Items', clickData: 'Featured,' },
        { name: 'Featured Hats', clickData: 'Featured,Hats' },
        { name: 'Featured Gear', clickData: 'Featured,Gear' },
        { name: 'Featured Faces', clickData: 'Featured,Faces' },
        { name: 'Featured Packages', clickData: 'Featured,Packages' },
      ],
    },
  },
  {
    id: 'Collectibles',
    name: 'Collectibles',
    clickData: 'Collectibles,',
    children: {
      title: 'Collectible Types',
      children: [
        { name: 'All Collectibles', clickData: 'Collectibles,' },
        { name: 'Collectible Faces', clickData: 'Collectibles,Faces' },
        { name: 'Collectible Hats', clickData: 'Collectibles,Hats' },
        { name: 'Collectible Gear', clickData: 'Collectibles,Gear' },
      ],
    },
  },
  {
    id: 'Emotes',
    name: 'Emotes',
    clickData: 'Emotes,Emotes',
  },
  {
    name: 'separator',
    clickData: '',
  },
  {
    id: 'All',
    name: 'All Categories',
    clickData: 'All,',
  },
  {
    id: 'BodyParts',
    name: 'Body Parts',
    clickData: 'BodyParts,All',
    children: {
      title: 'Body Part Types',
      children: [
        { name: 'All Body Parts', clickData: 'BodyParts,All' },
        { name: 'Heads', clickData: 'BodyParts,Heads' },
        { name: 'Dynamic Heads', clickData: 'BodyParts,DynamicHeads' },
        { name: 'Faces', clickData: 'BodyParts,Faces' },
        { name: 'Packages', clickData: 'BodyParts,Packages' },
      ],
    },
  },
  {
    id: 'Clothing',
    name: 'Clothing',
    clickData: 'Clothing,All',
    children: {
      title: 'Clothing Types',
      children: [
        { name: 'All Clothing', clickData: 'Clothing,All' },
        { name: 'Hats', clickData: 'Clothing,Hats' },
        { name: 'Hair', clickData: 'Clothing,Hair' },
        { name: 'Accessories', clickData: 'Clothing,Accessories' },
        { name: 'Shirts', clickData: 'Clothing,Shirts' },
        { name: 'T-Shirts', clickData: 'Clothing,TShirts' },
        { name: 'Pants', clickData: 'Clothing,Pants' },
        { name: 'Packages', clickData: 'Clothing,Packages' },
      ],
    },
  },
  {
    id: 'Gear',
    name: 'Gear',
    clickData: 'Gear,all',
    children: {
      title: 'Gear Categories',
      children: [
        { name: 'All Gear', clickData: 'Gear,all' },
        { name: 'Melee Weapon', clickData: 'Gear,melee' },
        { name: 'Ranged Weapon', clickData: 'Gear,ranged' },
        { name: 'Explosive', clickData: 'Gear,explosive' },
        { name: 'Power Up', clickData: 'Gear,powerup' },
        { name: 'Navigation Enhancer', clickData: 'Gear,navigation' },
        { name: 'Musical Instrument', clickData: 'Gear,musical' },
        { name: 'Social Item', clickData: 'Gear,social' },
        { name: 'Building Tool', clickData: 'Gear,building' },
        { name: 'Personal Transport', clickData: 'Gear,transport' },
      ],
    },
  },
];

const useTitleStyles = createUseStyles({
  top: {
    fontSize: '12px',
    color: 'white',
    fontWeight: 600,
    lineHeight: 'normal',
    marginBottom: '-5px',
    paddingLeft: '4px',
    textShadow: '1px 1px 1px black',
  },
  bottom: {
    fontSize: '20px',
    color: 'white',
    fontWeight: 700,
    lineHeight: 'normal',
    paddingLeft: '4px',
    textShadow: '1px 1px 1px black',
  },
});

const CatalogPageNavigation = () => {
  const store = CatalogPageStore.useContainer();
  const title = useTitleStyles();
  return (
    <Dropdown
      selected={store.category}
      onClick={(e, clickData) => {
        if (!clickData) return;
        const [category, subCategory = ''] = clickData.split(',');
        if (!category) return;
        store.setCategory(category);
        store.setSubCategory(subCategory);
      }}
      title={
        <div>
          <p className={`mt-0 ${title.top}`}>Browse by</p>
          <h2 className={`mb-0 mt-0 ${title.bottom}`}>Category</h2>
        </div>
      }
      items={navigationItems}
    />
  );
};

export default CatalogPageNavigation;
