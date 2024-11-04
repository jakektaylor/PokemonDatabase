//Add TimSort to sort Pokemon results and each row before adding the set data to the Pokemon data in the server program.
const MIN_MERGE = 32;

function minRunLength(n) 
{ 
    let r = 0; 
    while (n >= MIN_MERGE) 
    { 
        r = r | (n & 1); 
        n >>= 1; 
    } 
    return n + r; 
} 

/*NOTE: Left is included but right is not.*/
function merge(arr, left, mid, right, comparator) {
  let numLeft = mid-left+1;
  let numRight = right-mid;
  let leftArray = new Array(numLeft);
  let rightArray = new Array(numRight);
  for(let x=0;x<numLeft;x++) {
   leftArray[x] = arr[left+x];
  }
  for(let x=0;x<numRight;x++) {
   rightArray[x] = arr[mid+x+1];
  }
  let i = 0;                               //Current index in left array.
  let j = 0;                               //Current index in right array.
  let k = left;                            //Current index being modified in "arr".
  while(i < numLeft && j < numRight) {
   if(comparator.compare(leftArray[i], rightArray[j]) <= 0) arr[k++] = leftArray[i++];
   else arr[k++] = rightArray[j++];
  }

  while(i < numLeft) {
   arr[k++] = leftArray[i++];
  }
  while(j < numRight) {
   arr[k++] = rightArray[j++];
  }
}

/*Sorts the subarray arr[arr[left]...arr[right]] using mergeSort. This is a stabe sorting algorithm.*/
function mergeSort(arr, left, right, comparator) {
 if(right<=left) return;
 let mid = left + Math.floor((right-left)/2);
 mergeSort(arr, left, mid, comparator);
 mergeSort(arr, mid+1, right, comparator);
 merge(arr, left, mid, right, comparator);
}

/*Sorts the subarray arr[arr[left]...arr[right]] using insertionSort. This is a stable sorting algorithm.*/
function insertionSort(arr, left, right, comparator) {
  for(let i=left+1;i<=right;++i) {
    let currIndex = i;
    let prevIndex = i - 1;
    while(comparator.compare(arr[prevIndex], arr[currIndex]) > 0 && prevIndex >= 0) {
      let temp = arr[prevIndex];
      arr[prevIndex] = arr[currIndex];
      arr[currIndex] = temp;
      prevIndex--;
      currIndex--;
    } 
  }
}

/*Sorts an Array 'arr' of size 'n' using the 'TimSort' algorithm. This is a stable sorting algorithm.*/
function timSort(arr, n, comparator) {
  let minRun = minRunLength(MIN_MERGE);

  //Sort the runs.
  for(let i = 0; i < n; i += minRun) insertionSort(arr, i, Math.min(i + MIN_MERGE - 1, n - 1), comparator); 
  for(let size = minRun; size < n; size *= 2) { 
    for(let left = 0; left < n; left += 2 * size) { 
        let mid = left + size - 1; 
        let right = Math.min(left + 2 * size - 1 , n - 1); 
        if(mid < right)  merge(arr, left, mid, right, comparator); 
      } 
    }
}


class PokemonComparator {
  constructor(field) {
    //The field of the objects that we will compare.
    this.field = field;
    this.comparator = Intl.Collator("en-CA");
  }

  compare(obj1, obj2) {
    if(obj1 && obj2) {
      if(typeof(obj1[this.field]) === "object") 
        return this.comparator.compare(obj1[this.field][0], obj2[this.field][0]);
      else return this.comparator.compare(obj1[this.field], obj2[this.field]);
    }
  }
}

export {timSort, PokemonComparator};