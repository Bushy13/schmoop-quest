// Builds every sprite once at load from the art modules in js/art/.

const SPRITES = {
  dogs: Object.fromEntries(DOG_ORDER.map(id => [id, buildDogSprites(DOGS[id])])),
  dogsCoat: Object.fromEntries(DOG_ORDER.map(id => [id, buildDogSprites(DOGS[id], true)])), // raincoat versions
  owner: buildOwnerSprites(),
  vet: buildVetSprites(),
  staff: buildStaffSprites(),   // pet store attendants (red, blue, green aprons)
  guests: buildGuestSprites(),  // shoppers and party guests (the beg levels)
  beachPeople: buildBeachPeopleSprites(), // swimmers, sunbakers, readers and sandcastle kids
  parkDogs: Object.fromEntries(PARK_DOGS.map(id => [id, buildSheetSprites(id)])),
  cat: buildCatSprites(),
  ...buildCritterSprites(),     // frog, lizard
  ...buildExtraAnimalSprites(), // sleeping cat, bird, moth, bee, mouse, beetle, snake, carriers
  ...buildItemSprites(),        // snacks
  ...buildMoreItemSprites(),    // more snacks, toys, poop, honey, raincoat
  plants: { ...buildPlantSprites(), ...buildMorePlantSprites() },
  ...buildIconSprites(),        // stars
  ...buildSceneSprites(),       // trees, bushes
  furniture: buildFurnitureSprites(),
  vacuum: buildVacuumSprite(),
};
