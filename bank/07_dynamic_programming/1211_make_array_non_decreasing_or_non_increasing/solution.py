import heapq


def convert_array(nums: list[int]) -> int:
    def cost(arr: list[int]) -> int:
        ans = 0
        heap: list[int] = []
        for num in arr:
            if heap and heap[0] < num:
                ans += num - heapq.heappushpop(heap, num)
            heapq.heappush(heap, num)
        return ans

    return min(cost(nums), cost([-x for x in nums]))
