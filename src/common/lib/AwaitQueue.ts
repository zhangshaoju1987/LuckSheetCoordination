/**
 * 同步队列,让多个异步任务按顺序进行
 */
export type AwaitQueueOptions =
	{
		/**
		 * 当队列关闭（调用close方法）,reject掉未执行的任务时,向外抛出该自定义的异常,如果么有传入,则抛出默认的Error。
		 * 推荐使用
		 */
		ClosedErrorClass?: any;
		/**
		 * 当队列停止（调用stop方法）,reject掉未执行的任务时,向外抛出该自定义的异常,如果么有传入,则抛出默认的Error。
		 * 推荐使用
		 */
		StoppedErrorClass?: any;
	};

export type AwaitQueueTask<T> = () => (Promise<T> | T);

export type AwaitQueueDumpItem =
	{
		task: AwaitQueueTask<any>;
		name?: string;
		enqueuedTime: number;
		executingTime: number;
	};

type PendingTask =
	{
		task: AwaitQueueTask<any>;
		name?: string;
		resolve: (...args: any[]) => any;
		reject: (error: Error) => void;
		enqueuedAt: Date;
		executedAt?: Date;
		stopped: boolean;
	}

export class AwaitQueue {
	private closed = false;

	/**
	 * 只读的队列
	 */
	private readonly pendingTasks: Array<PendingTask> = [];

	/**
	 * 用于队列关闭时,对外抛出异常
	 */
	private readonly ClosedErrorClass = Error;

	/**
	 * 用于队列停止（清空当前队列任务）时,对外抛出异常
	 */
	private readonly StoppedErrorClass = Error;

	constructor(
		{
			ClosedErrorClass = Error,
			StoppedErrorClass = Error
		}: AwaitQueueOptions =
			{
				ClosedErrorClass: Error,
				StoppedErrorClass: Error
			}
	) {
		this.ClosedErrorClass = ClosedErrorClass;
		this.StoppedErrorClass = StoppedErrorClass;
	}

	/**
	 * 队列当前的任务个数
	 */
	get size(): number {
		return this.pendingTasks.length;
	}

	/**
	 * 关闭等待队列,每一个被迫中断的任务都会抛出异常
	 */
	close(): void {
		if (this.closed)
			return;

		this.closed = true;

		for (const pendingTask of this.pendingTasks) {
			pendingTask.stopped = true;
			pendingTask.reject(new this.ClosedErrorClass('AwaitQueue closed'));
		}

		// 清空队列数组
		this.pendingTasks.length = 0;
	}

	/**
	 * 将一个任务（一个满足AwaitQueueTask规范的函数）作为参数加入到队列
	 */
	async push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T> {
		if (this.closed)
			throw new this.ClosedErrorClass('AwaitQueue closed');

		if (typeof task !== 'function')
			throw new TypeError('given task is not a function');

		if (!task.name && name) {
			try {
				Object.defineProperty(task, 'name', { value: name });
			}
			catch (error) { }
		}

		return new Promise((resolve, reject) => {
			const pendingTask: PendingTask =
			{
				task,
				name,
				resolve,
				reject,
				stopped: false,
				enqueuedAt: new Date(),
				executedAt: undefined
			};

			// 添加到队列
			this.pendingTasks.push(pendingTask);

			// 如果是唯一的任务,则立即执行
			if (this.pendingTasks.length === 1)
				this.next();
		});
	}

	/**
	 * 清空队列
	 */
	empty(): void {
		this.stop();
	}

	/**
	 * 停掉当前执行的所有任务,但是后面加入的仍然有效
	 */
	stop(): void {
		if (this.closed)
			return;

		for (const pendingTask of this.pendingTasks) {
			pendingTask.stopped = true;
			pendingTask.reject(new this.StoppedErrorClass('AwaitQueue stopped'));
		}

		// 清空所有的队列任务
		this.pendingTasks.length = 0;
	}

	/**
	 * 导出任务队列
	 * @returns 
	 */
	dump(): AwaitQueueDumpItem[] {
		const now = new Date();

		return this.pendingTasks.map((pendingTask) => {
			return {
				task: pendingTask.task,
				name: pendingTask.name,
				enqueuedTime: pendingTask.executedAt
					? pendingTask.executedAt.getTime() - pendingTask.enqueuedAt.getTime()
					: now.getTime() - pendingTask.enqueuedAt.getTime(),
				executingTime: pendingTask.executedAt
					? now.getTime() - pendingTask.executedAt.getTime()
					: 0
			};
		});
	}

	private async next(): Promise<any> {
		// 获取第一个队列任务
		const pendingTask = this.pendingTasks[0];

		if (!pendingTask)
			return;

		// 执行队列
		await this.executeTask(pendingTask);

		// 移除执行完成的任务
		this.pendingTasks.shift();

		// 递归循环
		this.next();
	}

	private async executeTask(pendingTask: PendingTask): Promise<any> {
		// 忽略停止的任务
		if (pendingTask.stopped)
			return;

		pendingTask.executedAt = new Date();

		try {
			const result = await pendingTask.task();

			// 再次忽略停止的任务
			if (pendingTask.stopped)
				return;

			// 返回执行结果
			pendingTask.resolve(result);
		}
		catch (error) {
			// 忽略停止的任务
			if (pendingTask.stopped)
				return;

			// 抛出执行异常
			pendingTask.reject((error as Error));
		}
	}
}